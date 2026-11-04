import type { OrderHistoryPage } from '@elo/core/api/views/order.view';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    CancelActor,
    cancellationRule,
    returnRule
} from '@elo/core/orders/cancellation-rules';
import {
    OrderStatus,
    nextOrderStatus,
    orderHistoryStart,
    orderTotalCents,
    previousOrderStatus
} from '@elo/core/orders/order-status';
import { Repository } from 'typeorm';
import { TenantRepository } from '#/common/database/tenant.repository.js';
import { AuditLogService } from '#/modules/audit-logs/audit-log.service.js';
import { CatalogService } from '#/modules/catalog/catalog.service.js';
import { RealtimeService } from '#/modules/realtime/realtime.service.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';
import { SessionContext, TableService } from '#/modules/tables/table.service.js';
import { CreateOrderDTO } from './dto/create-order.dto.js';
import { ListOrdersQueryDTO } from './dto/list-orders-query.dto.js';
import { OrderHistoryQueryDTO } from './dto/order-history-query.dto.js';
import { OrderEntity } from './entities/order.entity.js';
import { InvalidProductException } from './exceptions/invalid-product.exception.js';
import { InvalidStatusTransitionException } from './exceptions/invalid-status-transition.exception.js';
import { OrderNotFoundException } from './exceptions/order-not-found.exception.js';
import { ReasonRequiredException } from './exceptions/reason-required.exception.js';
import { ORDER_LIMITS } from './order.constants.js';
import { orderRuleException } from './utils/order-rule-exception.js';
import { priceItem } from './utils/pricing.js';

@Injectable()
export class OrderService {
    constructor(
        @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
        private readonly catalog: CatalogService,
        private readonly tables: TableService,
        private readonly realtime: RealtimeService,
        private readonly audit: AuditLogService,
        private readonly staff: StaffService
    ) {}

    private scoped(rid: string) {
        return new TenantRepository(this.orders, rid);
    }

    /** Sending the order: the table must be open and validated by the waiter. */
    public async submit(ctx: SessionContext, dto: CreateOrderDTO): Promise<OrderEntity> {
        await this.tables.assertCanOrder(ctx);
        const ids = [...new Set(dto.items.map((i) => i.productId))];
        const products = await this.catalog.productsByIds(ctx.restaurantId, ids);
        const byId = new Map(products.map((p) => [p.id, p]));
        const items = dto.items.map((req) => {
            const product = byId.get(req.productId);
            if (!product) throw new InvalidProductException();
            return priceItem(product, req);
        });
        const order = await this.scoped(ctx.restaurantId).create({
            tableId: ctx.tableId,
            sessionId: ctx.sessionId,
            status: OrderStatus.SENT,
            items,
            cancelReason: null
        });
        await this.emit('order.created', order);
        return order;
    }

    /**
     * Arrival order. Without `limit` it answers the most recent ones (300 at most), so the
     * history does not grow forever on the kitchen and floor screens.
     */
    public async list(rid: string, q: ListOrdersQueryDTO = {}) {
        const qb = this.scoped(rid).qb('o');
        if (q.status?.length)
            qb.andWhere('o.status IN (:...statuses)', { statuses: q.status });
        if (q.from) qb.andWhere('o.createdAt >= :from', { from: q.from });
        if (q.to) qb.andWhere('o.createdAt < :to', { to: q.to });
        if (q.open)
            qb.innerJoin(
                TableSessionEntity,
                's',
                's.id = o.sessionId AND s.closedAt IS NULL'
            );
        const rows = await qb
            .orderBy('o.createdAt', 'DESC')
            .take(q.limit ?? ORDER_LIMITS.listDefault)
            .getMany();
        return this.withTableNames(rid, rows.reverse());
    }

    /**
     * Past and current orders, newest first, 20 per page. Floor roles only reach back
     * `ORDER_HISTORY_FLOOR_DAYS`; owner and managers see everything.
     */
    public async history(
        rid: string,
        user: JwtUser,
        q: OrderHistoryQueryDTO,
        timeZone: string
    ): Promise<OrderHistoryPage> {
        const pageSize = ORDER_LIMITS.historyPageSize;
        const page = q.page ?? 1;
        const limit = orderHistoryStart(user.roles, new Date());
        const qb = this.scoped(rid)
            .qb('o')
            .leftJoin(TableSessionEntity, 's', 's.id = o.sessionId')
            .addSelect(['s.openedBy', 's.closedAt']);
        if (q.status?.length)
            qb.andWhere('o.status IN (:...statuses)', { statuses: q.status });
        if (q.tableId) qb.andWhere('o.tableId = :tableId', { tableId: q.tableId });
        // Period in the restaurant's own days, so "today" matches the reports.
        if (q.from)
            qb.andWhere(
                `o.createdAt >= (CAST(:from AS date)::timestamp AT TIME ZONE :tz)`,
                { from: q.from, tz: timeZone }
            );
        if (q.to)
            qb.andWhere(
                `o.createdAt < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE :tz)`,
                { to: q.to, tz: timeZone }
            );
        if (limit) qb.andWhere('o.createdAt >= :limit', { limit });
        const total = await qb.getCount();
        const { entities, raw } = await qb
            .orderBy('o.createdAt', 'DESC')
            .offset((page - 1) * pageSize)
            .limit(pageSize)
            .getRawAndEntities();
        const sessions = new Map<
            string,
            { openedBy: string | null; closedAt: Date | null }
        >(
            raw.map(
                (r: {
                    o_id: string;
                    s_opened_by: string | null;
                    s_closed_at: Date | null;
                }) => [r.o_id, { openedBy: r.s_opened_by, closedAt: r.s_closed_at }]
            )
        );
        const names = await this.staff.names(
            [...sessions.values()].map((s) => s.openedBy)
        );
        const named = await this.withTableNames(rid, entities);
        return {
            items: named.map((o) => {
                const s = sessions.get(o.id);
                return {
                    ...o,
                    createdAt: o.createdAt.toISOString(),
                    totalCents: orderTotalCents(o.items),
                    servedBy: s?.openedBy ? (names.get(s.openedBy)?.name ?? null) : null,
                    closedAt: s?.closedAt ? new Date(s.closedAt).toISOString() : null
                };
            }),
            total,
            page,
            pageSize,
            limitedFrom: limit?.toISOString() ?? null
        };
    }

    /** Staff screens identify orders by table; the name travels with every order they receive. */
    private async withTableNames(rid: string, rows: OrderEntity[]) {
        const names = new Map((await this.tables.list(rid)).map((t) => [t.id, t.name]));
        return rows.map((o) => ({ ...o, tableName: names.get(o.tableId) }));
    }

    /** Orders that count on the bill: everything in the session but cancelled and returned ones. */
    public async billable(rid: string, sessionId: string) {
        const rows = await this.scoped(rid).find({ sessionId }, { createdAt: 'ASC' });
        return rows.filter(
            (o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.RETURNED
        );
    }

    public async listForSession(ctx: SessionContext) {
        const rows = await this.scoped(ctx.restaurantId).find(
            { sessionId: ctx.sessionId },
            { createdAt: 'ASC' }
        );
        return rows;
    }

    /** Only the kitchen moves an order, one step at a time. */
    public async advance(rid: string, id: string, to: OrderStatus): Promise<OrderEntity> {
        const order = await this.get(rid, id);
        if (nextOrderStatus(order.status) !== to)
            throw new InvalidStatusTransitionException();
        return this.step(order, to);
    }

    /** Undoes one step marked by mistake; the guest sees the corrected status. */
    public async revert(rid: string, id: string): Promise<OrderEntity> {
        const order = await this.get(rid, id);
        const to = previousOrderStatus(order.status);
        if (!to) throw new InvalidStatusTransitionException();
        return this.step(order, to);
    }

    /** Guarded by the status read, so two kitchen screens cannot apply the same step twice. */
    private async step(order: OrderEntity, to: OrderStatus): Promise<OrderEntity> {
        const result = await this.orders.update(
            { id: order.id, restaurantId: order.restaurantId, status: order.status },
            { status: to }
        );
        if (!result.affected) throw new InvalidStatusTransitionException();
        const saved = await this.get(order.restaurantId, order.id);
        await this.emit('order.updated', saved);
        const [named] = await this.withTableNames(order.restaurantId, [saved]);
        if (!named) throw new InvalidStatusTransitionException();
        return named;
    }

    public async cancelByCustomer(ctx: SessionContext, id: string, reason?: string) {
        const order = await this.get(ctx.restaurantId, id);
        if (order.sessionId !== ctx.sessionId) throw new OrderNotFoundException();
        return this.cancel(order, { kind: 'customer' }, reason);
    }

    public async cancelByStaff(user: JwtUser, id: string, reason: string) {
        const rid = user.restaurantId!;
        const order = await this.get(rid, id);
        const table = await this.tables.get(rid, order.tableId);
        const saved = await this.cancel(
            order,
            {
                kind: 'staff',
                roles: user.roles,
                managesTable: table.waiterId === user.sub
            },
            reason
        );
        await this.audit.record(user, 'order_cancelled', rid, {
            target: table.name,
            meta: { reason: saved.cancelReason, items: summarize(order) }
        });
        return saved;
    }

    /** An order already "ready" that the guest refused or returned: a separate status, never a cancellation. */
    public async returnByStaff(user: JwtUser, id: string, reason: string) {
        const rid = user.restaurantId!;
        const order = await this.get(rid, id);
        const table = await this.tables.get(rid, order.tableId);
        const decision = returnRule(
            {
                kind: 'staff',
                roles: user.roles,
                managesTable: table.waiterId === user.sub
            },
            order.status
        );
        if (!decision.allowed) throw orderRuleException(decision.why);
        if (!reason?.trim()) throw new ReasonRequiredException();
        order.status = OrderStatus.RETURNED;
        order.cancelReason = reason.trim();
        const saved = await this.scoped(rid).save(order);
        await this.emit('order.updated', saved);
        await this.audit.record(user, 'order_returned', rid, {
            target: table.name,
            meta: { reason: saved.cancelReason, items: summarize(order) }
        });
        return saved;
    }

    private async cancel(order: OrderEntity, actor: CancelActor, reason?: string) {
        const decision = cancellationRule(actor, order.status);
        if (!decision.allowed) throw orderRuleException(decision.why);
        if (decision.reasonRequired && !reason?.trim())
            throw new ReasonRequiredException();
        const wasPreparing = decision.notifyKitchen;
        order.status = OrderStatus.CANCELLED;
        order.cancelReason = reason?.trim() || null;
        const saved = await this.scoped(order.restaurantId).save(order);
        await this.emit('order.cancelled', saved, { alertKitchen: wasPreparing });
        return saved;
    }

    private async get(rid: string, id: string) {
        const order = await this.scoped(rid).findOne({ id });
        if (!order) throw new OrderNotFoundException();
        return order;
    }

    private async emit(
        type: 'order.created' | 'order.updated' | 'order.cancelled',
        order: OrderEntity,
        extra: Record<string, unknown> = {}
    ) {
        const table = await this.tables.get(order.restaurantId, order.tableId);
        this.realtime.publish({
            type,
            restaurantId: order.restaurantId,
            tableId: order.tableId,
            payload: { ...order, tableName: table.name, ...extra }
        });
        // The table bill changes with the orders (cashier and guest reload it).
        this.realtime.publish({
            type: 'bill.updated',
            restaurantId: order.restaurantId,
            tableId: order.tableId,
            payload: { tableId: order.tableId }
        });
    }
}

/** "2x Margherita, 1x Coca" for activity records. */
function summarize(order: OrderEntity): string {
    return order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
}
