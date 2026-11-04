import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { restaurantScope } from '@elo/core/sessions/session-scope';
import { isReservedSlug } from '@elo/core/slug/slug';
import { AccessState } from '@elo/core/subscription/subscription';
import { DataSource, IsNull, LessThan, Not, Repository } from 'typeorm';
import { MEDIA_URL_PATTERN } from '#/common/constants.js';
import { AuditLogService } from '#/modules/audit-logs/audit-log.service.js';
import { PaymentEntity } from '#/modules/billing/entities/payment.entity.js';
import { WaiterCallEntity } from '#/modules/calls/entities/waiter-call.entity.js';
import { CategoryEntity } from '#/modules/catalog/entities/category.entity.js';
import { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import { MediaEntity } from '#/modules/media/entities/media.entity.js';
import { OrderEntity } from '#/modules/orders/entities/order.entity.js';
import { RealtimeService } from '#/modules/realtime/realtime.service.js';
import { ReviewEntity } from '#/modules/reviews/entities/review.entity.js';
import { StaffSessionEntity } from '#/modules/sessions/entities/staff-session.entity.js';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';
import { DiningTableEntity } from '#/modules/tables/entities/dining-table.entity.js';
import { RestaurantSlugAliasEntity } from './entities/restaurant-slug-alias.entity.js';
import { RestaurantEntity } from './entities/restaurant.entity.js';
import { NotSuspendedException } from './exceptions/not-suspended.exception.js';
import { RestaurantNotFoundException } from './exceptions/restaurant-not-found.exception.js';
import { SlugMismatchException } from './exceptions/slug-mismatch.exception.js';
import { SlugReservedException } from './exceptions/slug-reserved.exception.js';
import { SlugTakenException } from './exceptions/slug-taken.exception.js';
import { RestaurantService } from './restaurant.service.js';
import { slugTaken } from './utils/restaurant-slug.js';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

/** How often the purge looks for restaurants past their retention period. */
const PURGE_EVERY_MS = 6 * 3_600_000;

/**
 * Deleting a restaurant is two-step: it must be suspended first, then it is
 * soft-deleted (hidden everywhere, restorable, exportable) and only erased
 * for good after `RESTAURANT_PURGE_DAYS`.
 */
@Injectable()
export class RestaurantLifecycleService
    implements OnApplicationBootstrap, OnApplicationShutdown
{
    private readonly log = new Logger(RestaurantLifecycleService.name);
    private timer?: ReturnType<typeof setInterval>;

    constructor(
        @InjectRepository(RestaurantEntity)
        private readonly restaurants: Repository<RestaurantEntity>,
        @InjectDataSource() private readonly db: DataSource,
        private readonly service: RestaurantService,
        private readonly realtime: RealtimeService,
        private readonly audit: AuditLogService,
        private readonly configService: ConfigService<EnvConfig, true>
    ) {}

    public onApplicationBootstrap() {
        this.timer = setInterval(() => void this.runPurge(), PURGE_EVERY_MS);
        this.timer.unref();
    }

    public onApplicationShutdown() {
        clearInterval(this.timer);
    }

    /** Suspending also drops the team's live connections, so screens stop at once. */
    public async setSuspended(
        id: string,
        suspended: boolean,
        actor: JwtUser
    ): Promise<RestaurantEntity> {
        const r = await this.service.setSuspended(id, suspended);
        if (suspended) this.realtime.disconnectRestaurant(id);
        await this.audit.record(
            actor,
            suspended ? 'restaurant_suspended' : 'restaurant_reactivated',
            id
        );
        return r;
    }

    /**
     * Gives the restaurant a new link. The old one becomes an alias, so printed QR codes,
     * NFC tags and the team's signed-in devices keep working; nobody else can take it.
     */
    public async changeSlug(
        id: string,
        next: string,
        reason: string,
        actor: JwtUser
    ): Promise<RestaurantEntity> {
        const r = await this.service.get(id);
        const from = r.slug;
        if (next === from) return r;
        if (isReservedSlug(next)) throw new SlugReservedException('slug');
        await this.db.transaction(async (em) => {
            if (await slugTaken(em, next, r.id)) throw new SlugTakenException('slug');
            // Going back to an old link of its own turns it into the current one again.
            await em.delete(RestaurantSlugAliasEntity, { slug: next });
            await em.insert(RestaurantSlugAliasEntity, {
                slug: from,
                restaurantId: r.id
            });
            await em.update(RestaurantEntity, { id: r.id }, { slug: next });
            await em.update(
                StaffSessionEntity,
                { scope: restaurantScope(from) },
                { scope: restaurantScope(next) }
            );
        });
        await this.audit.record(actor, 'slug_changed', id, {
            meta: { from, to: next, reason: reason.trim() }
        });
        return this.service.get(id);
    }

    public async remove(id: string, actor: JwtUser, confirmSlug: string): Promise<void> {
        const r = await this.service.get(id);
        if (confirmSlug.trim() !== r.slug) throw new SlugMismatchException();
        if ((await this.service.accessStateOf(id)) !== AccessState.SUSPENDED)
            throw new NotSuspendedException();
        await this.restaurants.update(
            { id },
            { deletedAt: new Date(), deletedBy: actor.sub }
        );
        this.realtime.disconnectRestaurant(id);
        await this.audit.record(actor, 'restaurant_deleted', id, { target: r.name });
    }

    /** Back as a suspended restaurant: someone still has to reactivate it on purpose. */
    public async restore(id: string, actor: JwtUser): Promise<RestaurantEntity> {
        const r = await this.restaurants.findOne({
            where: { id, deletedAt: Not(IsNull()) },
            withDeleted: true
        });
        if (!r) throw new RestaurantNotFoundException();
        await this.restaurants.update(
            { id },
            { deletedAt: null, deletedBy: null, suspended: true }
        );
        await this.audit.record(actor, 'restaurant_restored', id, { target: r.name });
        return this.service.get(id);
    }

    /** Everything the restaurant may ask back, without secrets (password hashes, table tokens). */
    public async export(id: string) {
        const restaurant = await this.restaurants.findOne({
            where: { id },
            withDeleted: true
        });
        if (!restaurant) throw new RestaurantNotFoundException();
        const em = this.db.manager;
        const where = { restaurantId: id };
        const [staff, categories, products, tables, orders, calls, payments, reviews] =
            await Promise.all([
                em.find(StaffUserEntity, { where }),
                em.find(CategoryEntity, { where }),
                em.find(ProductEntity, { where }),
                em.find(DiningTableEntity, { where }),
                em.find(OrderEntity, { where, order: { createdAt: 'ASC' } }),
                em.find(WaiterCallEntity, { where, order: { createdAt: 'ASC' } }),
                em.find(PaymentEntity, { where, order: { paidAt: 'ASC' } }),
                em.find(ReviewEntity, { where, order: { createdAt: 'ASC' } })
            ]);
        return {
            exportedAt: new Date().toISOString(),
            restaurant,
            staff: staff.map(({ passwordHash: _hash, ...rest }) => rest),
            categories,
            products,
            tables: tables.map(({ token: _token, ...rest }) => rest),
            orders,
            calls,
            payments,
            reviews
        };
    }

    /**
     * Erases every restaurant deleted more than `RESTAURANT_PURGE_DAYS` ago:
     * all rows carrying its id and its image files. `ids` narrows the run
     * (tests). The audit log is kept as the record that it happened.
     */
    public async purgeExpired(
        opts: { now?: Date; ids?: string[] } = {}
    ): Promise<string[]> {
        const purgeMs = this.configService.getOrThrow('retention.restaurantPurgeMs', {
            infer: true
        });
        const cutoff = new Date((opts.now ?? new Date()).getTime() - purgeMs);
        const due = await this.restaurants.find({
            where: { deletedAt: LessThan(cutoff) },
            withDeleted: true,
            select: { id: true }
        });
        const ids = due
            .map((r) => r.id)
            .filter((id) => !opts.ids || opts.ids.includes(id));
        for (const id of ids) await this.purge(id);
        return ids;
    }

    private async runPurge() {
        try {
            const ids = await this.purgeExpired();
            if (ids.length) this.log.log(`Purged ${ids.length} deleted restaurant(s)`);
        } catch (e) {
            this.log.error(`Purge failed: ${(e as Error).message}`);
        }
    }

    private async purge(id: string) {
        const media = await this.db.manager.find(MediaEntity, {
            where: { restaurantId: id },
            select: { id: true }
        });
        // Team profile photos are personal data: they go with the restaurant.
        const avatars: { avatar_url: string }[] = await this.db.query(
            `SELECT avatar_url FROM staff_users WHERE restaurant_id = $1 AND avatar_url IS NOT NULL`,
            [id]
        );
        // Proofs of payment and contracts live in the private folder, named by their id.
        const documents: { id: string }[] = await this.db.query(
            `SELECT id FROM documents WHERE restaurant_id = $1`,
            [id]
        );
        await this.db.transaction(async (em) => {
            const tables: { table_name: string }[] = await em.query(
                `SELECT table_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND column_name = 'restaurant_id' AND table_name <> 'audit_logs'`
            );
            // Contracts point at their documents, so they go first.
            await em.query(`DELETE FROM "contracts" WHERE "restaurant_id" = $1`, [id]);
            for (const { table_name } of tables)
                await em.query(`DELETE FROM "${table_name}" WHERE "restaurant_id" = $1`, [
                    id
                ]);
            await em.query(`DELETE FROM "restaurants" WHERE "id" = $1`, [id]);
        });
        await this.audit.record('system', 'restaurant_purged', id);
        const dir = this.configService.getOrThrow('app.uploadDir', { infer: true });
        const photos = avatars
            .map((a) => MEDIA_URL_PATTERN.exec(a.avatar_url)?.[1])
            .filter((f): f is string => !!f);
        const files = [
            ...media.flatMap((m) => [`${m.id}.webp`, `${m.id}-sm.webp`]),
            ...photos.map((f) => `${f}.webp`),
            ...documents.map((d) => path.join('private', d.id))
        ];
        await Promise.all(
            files.map((f) => unlink(path.join(dir, f)).catch(() => undefined))
        );
    }
}
