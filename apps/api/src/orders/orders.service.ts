import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CancelActor, cancellationRule, nextOrderStatus, OrderStatus } from '@elo/core';
import { TenantRepo } from '../common/tenant-repo';
import type { JwtUser } from '../common/auth-types';
import { Order } from '../database/entities';
import { CatalogService } from '../catalog/catalog.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SessionContext, TablesService } from '../tables/tables.service';
import { priceItem } from './pricing';
import { CreateOrderDto } from './orders.dto';

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

  /** Ordem de chegada. */
  list(rid: string, statuses?: OrderStatus[]) {
    return this.scoped(rid)
      .find({}, { createdAt: 'ASC' })
      .then((rows) => (statuses ? rows.filter((o) => statuses.includes(o.status)) : rows));
  }

  async listForSession(ctx: SessionContext) {
    const rows = await this.scoped(ctx.restaurantId).find({ sessionId: ctx.sessionId }, { createdAt: 'ASC' });
    return rows;
  }

  /** Só a cozinha avança, um passo por vez. */
  async advance(rid: string, id: string, to: OrderStatus): Promise<Order> {
    const order = await this.get(rid, id);
    if (nextOrderStatus(order.status) !== to) throw new ConflictException('invalid_status_transition');
    order.status = to;
    const saved = await this.scoped(rid).save(order);
    await this.emit('order.updated', saved);
    return saved;
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
      { kind: 'staff', role: user.role, managesTable: table.waiterId === user.sub },
      reason,
    );
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
  }
}
