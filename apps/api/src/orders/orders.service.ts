import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CancelActor, cancellationRule, nextOrderStatus, OrderStatus, previousOrderStatus, returnRule } from '@elo/core';
import { TenantRepo } from '../common/tenant-repo';
import type { JwtUser } from '../common/auth-types';
import { Order } from '../database/entities';
import { CatalogService } from '../catalog/catalog.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SessionContext, TablesService } from '../tables/tables.service';
import { priceItem } from './pricing';
import { CreateOrderDto, ListOrdersQuery } from './orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly catalog: CatalogService,
    private readonly tables: TablesService,
    private readonly realtime: RealtimeService,
  ) {}

  private scoped(rid: string) {
    return new TenantRepo(this.orders, rid);
  }

  /** Envio da comanda: a mesa precisa estar aberta e validada pelo garçom. */
  async submit(ctx: SessionContext, dto: CreateOrderDto): Promise<Order> {
    await this.tables.assertCanOrder(ctx);
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.catalog.productsByIds(ctx.restaurantId, ids);
    const byId = new Map(products.map((p) => [p.id, p]));
    const items = dto.items.map((req) => {
      const product = byId.get(req.productId);
      if (!product) throw new BadRequestException('invalid_product');
      return priceItem(product, req);
    });
    const order = await this.scoped(ctx.restaurantId).create({
      tableId: ctx.tableId,
      sessionId: ctx.sessionId,
      status: OrderStatus.Sent,
      items,
      cancelReason: null,
    });
    await this.emit('order.created', order);
    return order;
  }

  /**
   * Ordem de chegada. Sem `limit` devolve os mais recentes (máx. 300), para o
   * histórico não crescer sem fim na tela da cozinha e do salão.
   */
  async list(rid: string, q: ListOrdersQuery = {}) {
    const qb = this.scoped(rid).qb('o');
    if (q.status?.length) qb.andWhere('o.status IN (:...statuses)', { statuses: q.status });
    if (q.from) qb.andWhere('o.createdAt >= :from', { from: q.from });
    if (q.to) qb.andWhere('o.createdAt < :to', { to: q.to });
    const rows = await qb
      .orderBy('o.createdAt', 'DESC')
      .take(q.limit ?? 300)
      .getMany();
    return this.withTableNames(rid, rows.reverse());
  }

  /** Staff screens identify orders by table; the name travels with every order they receive. */
  private async withTableNames(rid: string, rows: Order[]) {
    const names = new Map((await this.tables.list(rid)).map((t) => [t.id, t.name]));
    return rows.map((o) => ({ ...o, tableName: names.get(o.tableId) }));
  }

  /** Pedidos que contam na conta: tudo da sessão menos cancelados e devolvidos. */
  async billable(rid: string, sessionId: string) {
    const rows = await this.scoped(rid).find({ sessionId }, { createdAt: 'ASC' });
    return rows.filter((o) => o.status !== OrderStatus.Cancelled && o.status !== OrderStatus.Returned);
  }

  async listForSession(ctx: SessionContext) {
    const rows = await this.scoped(ctx.restaurantId).find({ sessionId: ctx.sessionId }, { createdAt: 'ASC' });
    return rows;
  }

  /** Only the kitchen moves an order, one step at a time. */
  async advance(rid: string, id: string, to: OrderStatus): Promise<Order> {
    const order = await this.get(rid, id);
    if (nextOrderStatus(order.status) !== to) throw new ConflictException('invalid_status_transition');
    return this.step(order, to);
  }

  /** Undoes one step marked by mistake; the guest sees the corrected status. */
  async revert(rid: string, id: string): Promise<Order> {
    const order = await this.get(rid, id);
    const to = previousOrderStatus(order.status);
    if (!to) throw new ConflictException('invalid_status_transition');
    return this.step(order, to);
  }

  /** Guarded by the status read, so two kitchen screens cannot apply the same step twice. */
  private async step(order: Order, to: OrderStatus): Promise<Order> {
    const result = await this.orders.update({ id: order.id, restaurantId: order.restaurantId, status: order.status }, { status: to });
    if (!result.affected) throw new ConflictException('invalid_status_transition');
    const saved = await this.get(order.restaurantId, order.id);
    await this.emit('order.updated', saved);
    return (await this.withTableNames(order.restaurantId, [saved]))[0];
  }

  async cancelByCustomer(ctx: SessionContext, id: string, reason?: string) {
    const order = await this.get(ctx.restaurantId, id);
    if (order.sessionId !== ctx.sessionId) throw new NotFoundException();
    return this.cancel(order, { kind: 'customer' }, reason);
  }

  async cancelByStaff(user: JwtUser, id: string, reason: string) {
    const rid = user.restaurantId!;
    const order = await this.get(rid, id);
    const table = await this.tables.get(rid, order.tableId);
    return this.cancel(
      order,
      { kind: 'staff', roles: user.roles, managesTable: table.waiterId === user.sub },
      reason,
    );
  }

  /** Pedido já "pronto" que o cliente recusou/devolveu: status separado, nunca cancelamento. */
  async returnByStaff(user: JwtUser, id: string, reason: string) {
    const rid = user.restaurantId!;
    const order = await this.get(rid, id);
    const table = await this.tables.get(rid, order.tableId);
    const decision = returnRule(
      { kind: 'staff', roles: user.roles, managesTable: table.waiterId === user.sub },
      order.status,
    );
    if (!decision.allowed) throw new ForbiddenException(decision.why);
    if (!reason?.trim()) throw new BadRequestException('reason_required');
    order.status = OrderStatus.Returned;
    order.cancelReason = reason.trim();
    const saved = await this.scoped(rid).save(order);
    await this.emit('order.updated', saved);
    return saved;
  }

  private async cancel(order: Order, actor: CancelActor, reason?: string) {
    const decision = cancellationRule(actor, order.status);
    if (!decision.allowed) throw new ForbiddenException(decision.why);
    if (decision.reasonRequired && !reason?.trim()) throw new BadRequestException('reason_required');
    const wasPreparing = decision.notifyKitchen;
    order.status = OrderStatus.Cancelled;
    order.cancelReason = reason?.trim() || null;
    const saved = await this.scoped(order.restaurantId).save(order);
    await this.emit('order.cancelled', saved, { alertKitchen: wasPreparing });
    return saved;
  }

  private async get(rid: string, id: string) {
    const order = await this.scoped(rid).findOne({ id });
    if (!order) throw new NotFoundException();
    return order;
  }

  private async emit(
    type: 'order.created' | 'order.updated' | 'order.cancelled',
    order: Order,
    extra: Record<string, unknown> = {},
  ) {
    const table = await this.tables.get(order.restaurantId, order.tableId);
    this.realtime.publish({
      type,
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      payload: { ...order, tableName: table.name, ...extra },
    });
    // A conta da mesa muda junto com os pedidos (caixa e cliente recarregam).
    this.realtime.publish({
      type: 'bill.updated',
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      payload: { tableId: order.tableId },
    });
  }
}
