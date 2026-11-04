import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import type { SessionClosedReason } from './types/session-closed-reason.type.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { TableState } from '@elo/core/tables/table-state';
import { canTransitionTable, canWaiterClose } from '@elo/core/tables/table-transitions';
import QRCode from 'qrcode';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { UUID_PATTERN } from '#/common/constants.js';
import { TenantRepository } from '#/common/database/tenant.repository.js';
import { InvariantViolationException } from '#/common/exceptions/invariant-violation.exception.js';
import { AuditLogService } from '#/modules/audit-logs/audit-log.service.js';
import { PauseService } from '#/modules/pauses/pause.service.js';
import { GuestPushSubscriptionEntity } from '#/modules/push/entities/guest-push-subscription.entity.js';
import { RealtimeService } from '#/modules/realtime/realtime.service.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { RestaurantNotFoundException } from '#/modules/restaurants/exceptions/restaurant-not-found.exception.js';
import { restaurantBySlug } from '#/modules/restaurants/utils/restaurant-slug.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { DiningTableEntity } from './entities/dining-table.entity.js';
import { TableSessionEntity } from './entities/table-session.entity.js';
import { AlreadyHandledException } from './exceptions/already-handled.exception.js';
import { InvalidTableStateException } from './exceptions/invalid-table-state.exception.js';
import { InvalidTableException } from './exceptions/invalid-table.exception.js';
import { SessionExpiredException } from './exceptions/session-expired.exception.js';
import { SessionInvalidException } from './exceptions/session-invalid.exception.js';
import { TableInUseException } from './exceptions/table-in-use.exception.js';
import { TableNotFoundException } from './exceptions/table-not-found.exception.js';
import { TableNotOpenException } from './exceptions/table-not-open.exception.js';
import { QR_CODE, TABLE_TOKEN_BYTES } from './table.constants.js';
import { sessionClosedException } from './utils/session-closed-exception.js';
import { randomBytes } from 'node:crypto';

export const newToken = () => randomBytes(TABLE_TOKEN_BYTES).toString('base64url');

/** Guest session context, already validated on the server. */
export interface SessionContext {
    sessionId: string;
    tableId: string;
    restaurantId: string;
}

@Injectable()
export class TableService {
    constructor(
        @InjectRepository(DiningTableEntity)
        private readonly tables: Repository<DiningTableEntity>,
        @InjectRepository(TableSessionEntity)
        private readonly sessions: Repository<TableSessionEntity>,
        @InjectRepository(RestaurantEntity)
        private readonly restaurants: Repository<RestaurantEntity>,
        private readonly realtime: RealtimeService,
        private readonly configService: ConfigService<EnvConfig, true>,
        private readonly staff: StaffService,
        private readonly audit: AuditLogService,
        private readonly pauses: PauseService
    ) {}

    private scoped(rid: string) {
        return new TenantRepository(this.tables, rid);
    }

    // Management (restaurant panel)

    public async create(rid: string, name: string, actor: JwtUser) {
        const table = await this.scoped(rid).create({
            name,
            token: newToken(),
            state: TableState.CLOSED,
            waiterId: null
        });
        await this.audit.record(actor, 'table_created', rid, { target: table.name });
        return table;
    }

    public list(rid: string) {
        return this.scoped(rid).find({}, { name: 'ASC' });
    }

    /** Tables waiting on a waiter (validate the opening or the closing). */
    public async pending(rid: string) {
        const all = await this.scoped(rid).find({}, { name: 'ASC' });
        return all.filter(
            (t) =>
                t.state === TableState.PENDING_OPEN ||
                t.state === TableState.PENDING_CLOSE
        );
    }

    public async remove(rid: string, id: string, actor: JwtUser) {
        const table = await this.get(rid, id);
        if (table.state !== TableState.CLOSED) throw new TableInUseException();
        await this.scoped(rid).remove({ id });
        await this.audit.record(actor, 'table_removed', rid, { target: table.name });
    }

    /** Token rotation: Elo team with permission only (checked on the route). */
    public async rotateToken(rid: string, id: string, actor: JwtUser) {
        const repo = this.scoped(rid);
        const table = await this.get(rid, id);
        table.token = newToken();
        await this.closeSessions(table.id, 'closed');
        // Guests of the ended session stop hearing about this table.
        await this.tables.manager.delete(GuestPushSubscriptionEntity, {
            tableId: table.id
        });
        table.state = TableState.CLOSED;
        table.waiterId = null;
        const saved = await repo.save(table);
        await this.audit.record(actor, 'table_token_rotated', rid, {
            target: table.name
        });
        return saved;
    }

    /** Elo panel: tables with token and slug to build the printed link. */
    public async adminList(rid: string) {
        const restaurant = await this.restaurants.findOne({ where: { id: rid } });
        if (!restaurant) throw new RestaurantNotFoundException();
        const base = this.configService
            .getOrThrow('app.publicUrl', { infer: true })
            .replace(/\/$/, '');
        const rows = await this.list(rid);
        return {
            slug: restaurant.slug,
            tables: rows.map((t) => ({
                id: t.id,
                name: t.name,
                state: t.state,
                token: t.token,
                url: `${base}/${restaurant.slug}/${t.token}`
            }))
        };
    }

    public async qrPng(rid: string, id: string): Promise<Buffer> {
        const table = await this.get(rid, id);
        const restaurant = await this.restaurants.findOneOrFail({ where: { id: rid } });
        const base = this.configService
            .getOrThrow('app.publicUrl', { infer: true })
            .replace(/\/$/, '');
        return QRCode.toBuffer(`${base}/${restaurant.slug}/${table.token}`, {
            margin: QR_CODE.margin,
            width: QR_CODE.width
        });
    }

    public async get(rid: string, id: string): Promise<DiningTableEntity> {
        const table = await this.scoped(rid).findOne({ id });
        if (!table) throw new TableNotFoundException();
        return table;
    }

    // Waiter

    /**
     * The first waiter to validate wins; anyone else gets 409 `already_handled`
     * with the winner's name instead of a second, conflicting update.
     */
    public async validateOpen(rid: string, tableId: string, actor: JwtUser) {
        await this.pauses.assertOpen(rid);
        const table = await this.move(
            rid,
            tableId,
            [TableState.PENDING_OPEN],
            TableState.OPEN,
            { waiterId: staffId(actor) },
            (em) =>
                this.stampSession(em, tableId, {
                    openedAt: new Date(),
                    openedBy: staffId(actor)
                })
        );
        if (!table) throw await this.lost(rid, tableId);
        return this.persist(table, actor, 'opened');
    }

    /** The waiter turns down the opening request: the table goes back to closed and the guest session ends. */
    public async rejectOpen(rid: string, tableId: string, actor: JwtUser) {
        const table = await this.move(
            rid,
            tableId,
            [TableState.PENDING_OPEN],
            TableState.CLOSED,
            { waiterId: null },
            (em) => this.closeSessions(tableId, 'rejected', staffId(actor), em)
        );
        if (!table) throw await this.lost(rid, tableId);
        return this.persist(table, actor, 'rejected');
    }

    /** Only staff close a table; the guest session ends with it. */
    public async close(rid: string, tableId: string, actor: JwtUser) {
        const table = await this.move(
            rid,
            tableId,
            [TableState.OPEN, TableState.PENDING_CLOSE],
            TableState.CLOSED,
            { waiterId: null },
            (em) => this.closeSessions(tableId, 'closed', staffId(actor), em)
        );
        if (!table) throw await this.lost(rid, tableId);
        return this.persist(table, actor, 'closed');
    }

    /** Another waiter takes over an open table (shift change); they become the one who can cancel its orders. */
    public async take(rid: string, tableId: string, actor: JwtUser) {
        const current = await this.get(rid, tableId);
        if (current.waiterId === staffId(actor)) return current;
        const table = await this.move(
            rid,
            tableId,
            [TableState.OPEN, TableState.PENDING_CLOSE],
            null,
            { waiterId: staffId(actor) }
        );
        if (!table) throw new InvalidTableStateException();
        const previous =
            (await this.staff.names([current.waiterId])).get(current.waiterId ?? '')
                ?.name ?? null;
        await this.audit.record(actor, 'table_taken', rid, {
            target: table.name,
            meta: previous ? { from: previous } : undefined
        });
        return this.persist(table, actor, 'taken');
    }

    /** Adds the full name of the waiter serving each table, for the staff panels. */
    public async withWaiterNames(rows: DiningTableEntity[]) {
        const names = await this.staff.names(rows.map((t) => t.waiterId));
        return rows.map((t) => ({
            ...t,
            waiterName: names.get(t.waiterId ?? '')?.name ?? null
        }));
    }

    /** Guest-facing name of the waiter serving the table, if any. */
    public async waiterNameOf(table: DiningTableEntity): Promise<string | null> {
        return (
            (await this.staff.names([table.waiterId])).get(table.waiterId ?? '')
                ?.guestName ?? null
        );
    }

    // Guest

    /**
     * Opens (or resumes) the table session from the link. An invalid token and a token of
     * another restaurant answer the same: not found. One active session per table; other
     * devices are blocked while it exists.
     */
    public async startSession(slug: string, token: string, cookieSessionId?: string) {
        const restaurant = await restaurantBySlug(this.restaurants.manager, slug);
        const table = restaurant
            ? await this.tables.findOne({ where: { token, restaurantId: restaurant.id } })
            : null;
        if (!restaurant || !table) throw new InvalidTableException();

        const active = await this.activeSession(table.id);
        if (active) {
            if (active.id === cookieSessionId)
                return { session: active, table, restaurant };
            // Table still closed: an abandoned session (the guest only scanned). A new scan takes over.
            // While the table is opening, open or closing, other devices are blocked.
            if (table.state !== TableState.CLOSED) throw new TableInUseException();
            await this.closeSessions(table.id, 'taken_over');
        }
        const expiresInMs = this.configService.getOrThrow('session.tableExpiresInMs', {
            infer: true
        });
        const session = await this.sessions.save(
            this.sessions.create({
                restaurantId: restaurant.id,
                tableId: table.id,
                expiresAt: new Date(Date.now() + expiresInMs),
                closedAt: null,
                closedReason: null
            })
        );
        return { session, table, restaurant };
    }

    /** Validates the cookie: the session exists, has not expired and has not ended. */
    public async resolveSession(sessionId: string | undefined): Promise<SessionContext> {
        if (!sessionId || !UUID_PATTERN.test(sessionId))
            throw new SessionInvalidException();
        const s = await this.sessions.findOne({ where: { id: sessionId } });
        if (!s) throw new SessionInvalidException();
        if (s.closedAt) throw sessionClosedException(s.closedReason);
        if (s.expiresAt.getTime() < Date.now()) throw new SessionExpiredException();
        return { sessionId: s.id, tableId: s.tableId, restaurantId: s.restaurantId };
    }

    public async tableOf(ctx: SessionContext): Promise<DiningTableEntity> {
        return this.get(ctx.restaurantId, ctx.tableId);
    }

    public async requestOpen(ctx: SessionContext) {
        await this.pauses.assertOpen(ctx.restaurantId);
        const table = await this.move(
            ctx.restaurantId,
            ctx.tableId,
            [TableState.CLOSED],
            TableState.PENDING_OPEN
        );
        if (!table) throw new InvalidTableStateException();
        await this.sessions.update(
            { id: ctx.sessionId },
            { openRequestedAt: new Date() }
        );
        return this.persist(table, undefined, 'open_requested');
    }

    public async requestClose(ctx: SessionContext) {
        const table = await this.move(
            ctx.restaurantId,
            ctx.tableId,
            [TableState.OPEN],
            TableState.PENDING_CLOSE
        );
        if (!table) throw new InvalidTableStateException();
        await this.sessions.update(
            { id: ctx.sessionId },
            { closeRequestedAt: new Date() }
        );
        return this.persist(table, undefined, 'close_requested');
    }

    /** Orders only go out once the table was opened and validated by the waiter. */
    public async assertCanOrder(ctx: SessionContext): Promise<DiningTableEntity> {
        const table = await this.tableOf(ctx);
        if (table.state !== TableState.OPEN) throw new TableNotOpenException();
        return table;
    }

    // ---- internos ----

    /** Active session of the table (the bill belongs to it). */
    public activeSessionOf(tableId: string) {
        return this.activeSession(tableId);
    }

    private activeSession(tableId: string) {
        return this.sessions
            .createQueryBuilder('s')
            .where(
                's.table_id = :tableId AND s.closed_at IS NULL AND s.expires_at > now()',
                { tableId }
            )
            .getOne();
    }

    private async closeSessions(
        tableId: string,
        reason: SessionClosedReason,
        closedBy: string | null = null,
        em?: EntityManager
    ) {
        const repo = em ? em.getRepository(TableSessionEntity) : this.sessions;
        await repo.update(
            { tableId, closedAt: IsNull() },
            { closedAt: new Date(), closedReason: reason, closedBy }
        );
    }

    private async stampSession(
        em: EntityManager,
        tableId: string,
        fields: Partial<TableSessionEntity>
    ) {
        await em
            .getRepository(TableSessionEntity)
            .createQueryBuilder()
            .update()
            .set(fields)
            .where('table_id = :tableId AND closed_at IS NULL AND expires_at > now()', {
                tableId
            })
            .execute();
    }

    /**
     * Compare-and-set on the table state: a single UPDATE guarded by the
     * expected states, so two staff members acting at the same instant cannot
     * both succeed. Returns null when the table was no longer in `from`.
     * `to` null keeps the current state and only applies `set`. `alongside`
     * runs in the same transaction, so whoever loses the race only reads the
     * table after the winner's session record is committed.
     */
    private async move(
        rid: string,
        tableId: string,
        from: TableState[],
        to: TableState | null,
        set: Partial<Pick<DiningTableEntity, 'waiterId'>> = {},
        alongside?: (em: EntityManager) => Promise<unknown>
    ): Promise<DiningTableEntity | null> {
        const allowed = (f: TableState) =>
            !to ||
            canTransitionTable(f, to) ||
            (to === TableState.CLOSED && canWaiterClose(f));
        if (!from.every(allowed))
            throw new InvariantViolationException(`invalid table transition to ${to}`);
        const moved = await this.tables.manager.transaction(async (em) => {
            const result = await em
                .getRepository(DiningTableEntity)
                .update(
                    { id: tableId, restaurantId: rid, state: In(from) },
                    { ...set, ...(to ? { state: to } : {}) }
                );
            if (!result.affected) return false;
            await alongside?.(em);
            return true;
        });
        const table = await this.get(rid, tableId);
        return moved ? table : null;
    }

    /** 409 for the staff member who lost the race, naming who handled the table first. */
    private async lost(rid: string, tableId: string) {
        const table = await this.get(rid, tableId);
        const last = await this.sessions.findOne({
            where: { tableId },
            order: { createdAt: 'DESC' }
        });
        const by = table.state === TableState.CLOSED ? last?.closedBy : last?.openedBy;
        const name = (await this.staff.names([by])).get(by ?? '')?.name ?? null;
        return new AlreadyHandledException({ by: name, state: table.state });
    }

    /** `change` says what just happened, so listeners can tell an opening from a waiter taking over. */
    private async persist(
        table: DiningTableEntity,
        actor?: JwtUser,
        change?: TableChange
    ) {
        const id = actor ? staffId(actor) : null;
        const names = await this.staff.names([table.waiterId, id]);
        this.realtime.publish({
            type: 'table.updated',
            restaurantId: table.restaurantId,
            tableId: table.id,
            payload: {
                id: table.id,
                name: table.name,
                state: table.state,
                waiterId: table.waiterId,
                waiterName: names.get(table.waiterId ?? '')?.guestName ?? null,
                handledBy: id ? { id, name: names.get(id)?.guestName ?? null } : null,
                change: change ?? null
            }
        });
        return table;
    }
}

export type TableChange =
    'open_requested' | 'opened' | 'rejected' | 'close_requested' | 'closed' | 'taken';

/** Elo support inside a restaurant panel has no staff row; only real team members are recorded. */
function staffId(actor: JwtUser): string | null {
    return UUID_PATTERN.test(actor.sub) ? actor.sub : null;
}
