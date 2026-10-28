import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillView, calculateBill, FeeWaivedBy, TableState } from '@elo/core';
import { DiningTable, TableSession } from '../database/entities';
import { OrdersService } from '../orders/orders.service';
import { RealtimeService } from '../realtime/realtime.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { SessionContext, TablesService } from '../tables/tables.service';
import { AdjustmentDto } from './bills.dto';

/**
 * Conta da mesa. Valor sempre calculado no servidor a partir dos pedidos válidos
 * da sessão ativa; o que fica guardado é só o que não dá para derivar: taxa
 * removida e ajustes manuais.
 */
@Injectable()
export class BillsService {
  constructor(
    @InjectRepository(TableSession) private readonly sessions: Repository<TableSession>,
    private readonly tables: TablesService,
    private readonly orders: OrdersService,
    private readonly restaurants: RestaurantsService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Mesas com conta em andamento (qualquer estado diferente de fechada). */
  async list(rid: string): Promise<BillView[]> {
    const all = await this.tables.list(rid);
    const active = all.filter((t) => t.state !== TableState.Closed);
    return Promise.all(active.map((t) => this.build(rid, t)));
  }

  async view(rid: string, tableId: string): Promise<BillView> {
    return this.build(rid, await this.tables.get(rid, tableId));
  }

  async viewForSession(ctx: SessionContext): Promise<BillView> {
    return this.view(ctx.restaurantId, ctx.tableId);
  }

  async setFeeWaived(rid: string, tableId: string, waived: boolean): Promise<BillView> {
    const session = await this.requireSession(rid, tableId);
    session.feeWaivedBy = waived ? 'staff' : null;
    await this.sessions.save(session);
    return this.changed(rid, tableId);
  }

  /** Cliente recusa a taxa (ou volta atrás, desde que ele mesmo a tenha recusado). */
  async refuseFee(ctx: SessionContext, refuse: boolean): Promise<BillView> {
    const session = await this.sessions.findOne({ where: { id: ctx.sessionId } });
    if (!session) throw new NotFoundException();
    if (refuse) session.feeWaivedBy ??= 'customer';
    else if (session.feeWaivedBy === 'customer') session.feeWaivedBy = null;
    await this.sessions.save(session);
    return this.changed(ctx.restaurantId, ctx.tableId);
  }

  async addAdjustment(rid: string, tableId: string, dto: AdjustmentDto, by: string): Promise<BillView> {
    if (dto.cents === 0) throw new BadRequestException('zero_adjustment');
    const session = await this.requireSession(rid, tableId);
    if (session.adjustments.length >= 50) throw new ConflictException('too_many_adjustments');
    session.adjustments = [
      ...session.adjustments,
      { label: dto.label.trim(), cents: dto.cents, reason: dto.reason?.trim() || null, by, createdAt: new Date().toISOString() },
    ];
    await this.sessions.save(session);
    return this.changed(rid, tableId);
  }

  async removeAdjustment(rid: string, tableId: string, index: number): Promise<BillView> {
    const session = await this.requireSession(rid, tableId);
    if (!Number.isInteger(index) || index < 0 || index >= session.adjustments.length) {
      throw new NotFoundException();
    }
    session.adjustments = session.adjustments.filter((_, i) => i !== index);
    await this.sessions.save(session);
    return this.changed(rid, tableId);
  }

  private async requireSession(rid: string, tableId: string): Promise<TableSession> {
    await this.tables.get(rid, tableId);
    const session = await this.tables.activeSessionOf(tableId);
    if (!session) throw new ConflictException('no_active_session');
    return session;
  }

  private async changed(rid: string, tableId: string): Promise<BillView> {
    this.realtime.publish({ type: 'bill.updated', restaurantId: rid, tableId, payload: { tableId } });
    return this.view(rid, tableId);
  }

  private async build(rid: string, table: DiningTable): Promise<BillView> {
    const [restaurant, session] = await Promise.all([
      this.restaurants.get(rid),
      this.tables.activeSessionOf(table.id),
    ]);
    const orders = session ? await this.orders.billable(rid, session.id) : [];
    const lines = orders.flatMap((o) =>
      o.items.map((i) => ({
        name: i.name,
        unitCents: i.unitCents,
        quantity: i.quantity,
        details: i.options.map((opt) => `${opt.group}: ${opt.label}`),
      })),
    );
    const adjustments = session?.adjustments ?? [];
    const feeWaivedBy: FeeWaivedBy | null = session?.feeWaivedBy ?? null;
    const bill = calculateBill(lines, restaurant.serviceFeeBps, feeWaivedBy !== null, adjustments);
    return {
      tableId: table.id,
      tableName: table.name,
      state: table.state,
      serviceFeeBps: restaurant.serviceFeeBps,
      feeWaivedBy,
      lines,
      adjustments: adjustments.map(({ label, cents, reason, createdAt }) => ({ label, cents, reason, createdAt })),
      ...bill,
    };
  }
}
