import type { GuestAlert } from '@elo/core/alerts/alerts';
import type { EnvConfig } from '#/config/env.js';
import type { VapidKeys } from './utils/web-push.js';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ALERTS, alertOf, alertsRole, guestAlertOf } from '@elo/core/alerts/alerts';
import { In, IsNull, Repository } from 'typeorm';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';
import { DiningTableEntity } from '#/modules/tables/entities/dining-table.entity.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';
import { GuestPushSubscriptionEntity } from './entities/guest-push-subscription.entity.js';
import { PushSubscriptionEntity } from './entities/push-subscription.entity.js';
import { TooManyDevicesException } from './exceptions/too-many-devices.exception.js';
import { sendPush } from './utils/web-push.js';

export interface CreatePushSubscriptionInput {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

/**
 * Sends the same alerts the open panel shows to the staff phones that
 * subscribed, so a locked phone still hears about a call or an order, and
 * tells guests who asked for it how their table and orders are doing.
 */
const GUEST_DEVICES_MAX = 5;

@Injectable()
export class PushService {
    private readonly log = new Logger(PushService.name);
    private readonly keys: VapidKeys | null;

    constructor(
        @InjectRepository(PushSubscriptionEntity)
        private readonly subs: Repository<PushSubscriptionEntity>,
        @InjectRepository(StaffUserEntity)
        private readonly users: Repository<StaffUserEntity>,
        @InjectRepository(RestaurantEntity)
        private readonly restaurants: Repository<RestaurantEntity>,
        @InjectRepository(GuestPushSubscriptionEntity)
        private readonly guests: Repository<GuestPushSubscriptionEntity>,
        @InjectRepository(DiningTableEntity)
        private readonly tables: Repository<DiningTableEntity>,
        @InjectRepository(TableSessionEntity)
        private readonly sessions: Repository<TableSessionEntity>,
        configService: ConfigService<EnvConfig, true>
    ) {
        const publicKey = configService.getOrThrow('push.vapidPublicKey', {
            infer: true
        });
        const privateKey = configService.getOrThrow('push.vapidPrivateKey', {
            infer: true
        });
        this.keys =
            publicKey && privateKey
                ? {
                      publicKey,
                      privateKey,
                      subject: configService.getOrThrow('push.vapidSubject', {
                          infer: true
                      })
                  }
                : null;
    }

    public publicKey(): string | null {
        return this.keys?.publicKey ?? null;
    }

    public async subscribe(
        staffId: string,
        restaurantId: string,
        sub: CreatePushSubscriptionInput
    ): Promise<void> {
        await this.subs.upsert(
            {
                staffId,
                restaurantId,
                endpoint: sub.endpoint,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
            },
            ['endpoint']
        );
    }

    public async unsubscribe(staffId: string, endpoint: string): Promise<void> {
        await this.subs.delete({ staffId, endpoint });
    }

    /** A guest at an open table: the device is bound to the session and goes away with it. */
    public async subscribeGuest(
        session: { restaurantId: string; tableId: string; sessionId: string },
        sub: CreatePushSubscriptionInput
    ): Promise<void> {
        // A few phones per table visit is plenty; more would only multiply outgoing requests.
        const known = await this.guests.count({
            where: { sessionId: session.sessionId }
        });
        if (
            known >= GUEST_DEVICES_MAX &&
            !(await this.guests.exist({
                where: { sessionId: session.sessionId, endpoint: sub.endpoint }
            }))
        ) {
            throw new TooManyDevicesException();
        }
        await this.guests.upsert(
            {
                restaurantId: session.restaurantId,
                tableId: session.tableId,
                sessionId: session.sessionId,
                endpoint: sub.endpoint,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
            },
            ['endpoint']
        );
    }

    public async unsubscribeGuest(sessionId: string, endpoint: string): Promise<void> {
        await this.guests.delete({ sessionId, endpoint });
    }

    /** Called for every realtime event; only alerts reach phones. Never throws. */
    public dispatch(
        event: string,
        restaurantId: string,
        tableId: string | undefined,
        payload: unknown
    ): void {
        const warn = (e: unknown) =>
            this.log.warn(`Push failed: ${(e as Error).message}`);
        const change =
            event === 'table.updated'
                ? (payload as { change?: unknown } | null)?.change
                : null;
        // The visit ended: the guest's device is forgotten (after the goodbye, when push is on).
        if (tableId && (change === 'rejected' || (change === 'closed' && !this.keys)))
            void this.guests.delete({ tableId }).catch(warn);
        if (!this.keys) return;
        const alert = alertOf(event, payload);
        if (alert) void this.deliver(restaurantId, alert).catch(warn);
        const guest = tableId ? guestAlertOf(event, payload) : null;
        if (guest) void this.deliverGuest(tableId!, guest).catch(warn);
    }

    /**
     * Only devices of the session still at the table get it; leftovers of ended
     * sessions are dropped on the way. The goodbye goes out before the table's
     * devices are erased.
     */
    private async deliverGuest(tableId: string, alert: GuestAlert) {
        const subs = await this.guests.find({ where: { tableId } });
        if (!subs.length) return;
        const closing = alert.kind === 'table_closed';
        const live = closing
            ? subs
            : await this.sessions
                  .createQueryBuilder('s')
                  .where(
                      's.id IN (:...ids) AND s.closedAt IS NULL AND s.expiresAt > now()',
                      { ids: [...new Set(subs.map((x) => x.sessionId))] }
                  )
                  .getMany()
                  .then((rows) => {
                      const open = new Set(rows.map((r) => r.id));
                      return subs.filter((x) => open.has(x.sessionId));
                  });
        const stale = subs.filter((x) => !live.includes(x));
        if (stale.length) await this.guests.delete({ id: In(stale.map((x) => x.id)) });
        const table = await this.tables.findOne({
            where: { id: tableId },
            select: { id: true, token: true, restaurantId: true }
        });
        const restaurant =
            table &&
            (await this.restaurants.findOne({
                where: { id: table.restaurantId },
                select: { id: true, slug: true }
            }));
        if (table && restaurant && live.length) {
            const message = {
                audience: 'guest',
                kind: alert.kind,
                params: { who: alert.who, items: alert.items },
                tag: alert.tag,
                url: `/${restaurant.slug}/${table.token}`
            };
            await Promise.all(
                live.map((x) => sendPush(x, message, this.keys!).catch(() => 0))
            );
        }
        if (closing) await this.guests.delete({ tableId });
    }

    private async deliver(
        restaurantId: string,
        alert: NonNullable<ReturnType<typeof alertOf>>
    ) {
        const subs = await this.subs.find({ where: { restaurantId } });
        if (!subs.length) return;
        const staff = await this.users.find({
            where: {
                id: In([...new Set(subs.map((s) => s.staffId))]),
                active: true,
                deletedAt: IsNull()
            },
            select: { id: true, roles: true }
        });
        const allowed = new Set(
            staff.filter((u) => alertsRole(alert.kind, u.roles)).map((u) => u.id)
        );
        const targets = subs.filter((s) => allowed.has(s.staffId));
        if (!targets.length) return;
        const restaurant = await this.restaurants.findOne({
            where: { id: restaurantId },
            select: { id: true, slug: true }
        });
        if (!restaurant) return;
        const spec = ALERTS[alert.kind];
        const message = {
            audience: 'staff',
            kind: alert.kind,
            params: { table: alert.table },
            tag: alert.tag,
            url: `/r/${restaurant.slug}${spec.path}`
        };
        await Promise.all(
            targets.map(async (s) => {
                const status = await sendPush(s, message, this.keys!).catch(() => 0);
                if (status === HttpStatus.NOT_FOUND || status === HttpStatus.GONE)
                    await this.subs.delete({ id: s.id });
            })
        );
    }
}
