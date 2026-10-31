import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ALERTS, alertOf, alertsRole, type GuestAlert, guestAlertOf } from '@elo/core';
import type { Env } from '../config/env';
import { DiningTable, GuestPushSubscription, PushSubscription, Restaurant, StaffUser, TableSession } from '../database/entities';
import { sendPush, type VapidKeys } from './web-push';

export interface NewSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Sends the same alerts the open panel shows to the staff phones that
 * subscribed, so a locked phone still hears about a call or an order, and
 * tells guests who asked for it how their table and orders are doing.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);
  private readonly keys: VapidKeys | null;

  constructor(
    @InjectRepository(PushSubscription) private readonly subs: Repository<PushSubscription>,
    @InjectRepository(StaffUser) private readonly users: Repository<StaffUser>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(GuestPushSubscription) private readonly guests: Repository<GuestPushSubscription>,
    @InjectRepository(DiningTable) private readonly tables: Repository<DiningTable>,
    @InjectRepository(TableSession) private readonly sessions: Repository<TableSession>,
    config: ConfigService<Env, true>,
  ) {
    const publicKey = config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = config.get('VAPID_PRIVATE_KEY', { infer: true });
    this.keys = publicKey && privateKey ? { publicKey, privateKey, subject: config.get('VAPID_SUBJECT', { infer: true }) } : null;
  }

  publicKey(): string | null {
    return this.keys?.publicKey ?? null;
  }

  async subscribe(staffId: string, restaurantId: string, sub: NewSubscription): Promise<void> {
    await this.subs.upsert({ staffId, restaurantId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, ['endpoint']);
  }

  async unsubscribe(staffId: string, endpoint: string): Promise<void> {
    await this.subs.delete({ staffId, endpoint });
  }

  /** A guest at an open table: the device is bound to the session and goes away with it. */
  async subscribeGuest(session: { restaurantId: string; tableId: string; sessionId: string }, sub: NewSubscription): Promise<void> {
    await this.guests.upsert(
      { restaurantId: session.restaurantId, tableId: session.tableId, sessionId: session.sessionId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      ['endpoint'],
    );
  }

  async unsubscribeGuest(sessionId: string, endpoint: string): Promise<void> {
    await this.guests.delete({ sessionId, endpoint });
  }

  /** Called for every realtime event; only alerts reach phones. Never throws. */
  dispatch(event: string, restaurantId: string, tableId: string | undefined, payload: unknown): void {
    const warn = (e: unknown) => this.log.warn(`Push failed: ${(e as Error).message}`);
    const change = event === 'table.updated' ? (payload as { change?: unknown } | null)?.change : null;
    // The visit ended: the guest's device is forgotten (after the goodbye, when push is on).
    if (tableId && (change === 'rejected' || (change === 'closed' && !this.keys))) void this.guests.delete({ tableId }).catch(warn);
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
          .where('s.id IN (:...ids) AND s.closedAt IS NULL AND s.expiresAt > now()', { ids: [...new Set(subs.map((x) => x.sessionId))] })
          .getMany()
          .then((rows) => {
            const open = new Set(rows.map((r) => r.id));
            return subs.filter((x) => open.has(x.sessionId));
          });
    const stale = subs.filter((x) => !live.includes(x));
    if (stale.length) await this.guests.delete({ id: In(stale.map((x) => x.id)) });
    const table = await this.tables.findOne({ where: { id: tableId }, select: { id: true, token: true, restaurantId: true } });
    const restaurant = table && (await this.restaurants.findOne({ where: { id: table.restaurantId }, select: { id: true, slug: true } }));
    if (table && restaurant && live.length) {
      const message = { title: alert.title, body: alert.body, tag: alert.tag, url: `/${restaurant.slug}/${table.token}` };
      await Promise.all(live.map((x) => sendPush(x, message, this.keys!).catch(() => 0)));
    }
    if (closing) await this.guests.delete({ tableId });
  }

  private async deliver(restaurantId: string, alert: NonNullable<ReturnType<typeof alertOf>>) {
    const subs = await this.subs.find({ where: { restaurantId } });
    if (!subs.length) return;
    const staff = await this.users.find({
      where: { id: In([...new Set(subs.map((s) => s.staffId))]), active: true, deletedAt: IsNull() },
      select: { id: true, roles: true },
    });
    const allowed = new Set(staff.filter((u) => alertsRole(alert.kind, u.roles)).map((u) => u.id));
    const targets = subs.filter((s) => allowed.has(s.staffId));
    if (!targets.length) return;
    const restaurant = await this.restaurants.findOne({ where: { id: restaurantId }, select: { id: true, slug: true } });
    if (!restaurant) return;
    const spec = ALERTS[alert.kind];
    const message = { title: spec.title(alert.table), body: spec.body, tag: alert.tag, url: `/r/${restaurant.slug}${spec.path}` };
    await Promise.all(
      targets.map(async (s) => {
        const status = await sendPush(s, message, this.keys!).catch(() => 0);
        if (status === 404 || status === 410) await this.subs.delete({ id: s.id });
      }),
    );
  }
}
