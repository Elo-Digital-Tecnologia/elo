import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BillView, FeeWaivedBy } from '@elo/core/api/views/bill.view';
import { calculateBill } from '@elo/core/bills/bill';
import { summarizeOptions } from '@elo/core/catalog/option-summary';
import { TableState } from '@elo/core/tables/table-state';
import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '#/common/exceptions/resource-not-found.exception.js';
import { OrderService } from '#/modules/orders/order.service.js';
import { RealtimeService } from '#/modules/realtime/realtime.service.js';
import { RestaurantService } from '#/modules/restaurants/restaurant.service.js';
import { DiningTableEntity } from '#/modules/tables/entities/dining-table.entity.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';
import { TableSessionNotFoundException } from '#/modules/tables/exceptions/table-session-not-found.exception.js';
import { SessionContext, TableService } from '#/modules/tables/table.service.js';
import { MAX_BILL_ADJUSTMENTS } from './bill.constants.js';
import { AdjustmentDTO } from './dto/adjustment.dto.js';
import { FeeRefusalDisabledException } from './exceptions/fee-refusal-disabled.exception.js';
import { NoActiveSessionException } from './exceptions/no-active-session.exception.js';
import { TooManyAdjustmentsException } from './exceptions/too-many-adjustments.exception.js';
import { ZeroAdjustmentException } from './exceptions/zero-adjustment.exception.js';

/**
 * Table bill. The amount is always calculated on the server from the valid orders of
 * the active session; only what cannot be derived is stored: the removed service fee
 * and manual adjustments.
 */
@Injectable()
export class BillService {
    constructor(
        @InjectRepository(TableSessionEntity)
        private readonly sessions: Repository<TableSessionEntity>,
        private readonly tables: TableService,
        private readonly orders: OrderService,
        private readonly restaurants: RestaurantService,
        private readonly realtime: RealtimeService
    ) {}

    /** Tables with a bill in progress (any state other than closed). */
    public async list(rid: string): Promise<BillView[]> {
        const all = await this.tables.list(rid);
        const active = all.filter((t) => t.state !== TableState.CLOSED);
        return Promise.all(active.map((t) => this.build(rid, t)));
    }

    public async view(rid: string, tableId: string): Promise<BillView> {
        return this.build(rid, await this.tables.get(rid, tableId));
    }

    public async viewForSession(ctx: SessionContext): Promise<BillView> {
        return this.view(ctx.restaurantId, ctx.tableId);
    }

    public async setFeeWaived(
        rid: string,
        tableId: string,
        waived: boolean
    ): Promise<BillView> {
        const session = await this.requireSession(rid, tableId);
        session.feeWaivedBy = waived ? 'staff' : null;
        await this.sessions.save(session);
        return this.changed(rid, tableId);
    }

    /** The guest refuses the fee (or takes it back, as long as they refused it themselves). */
    public async refuseFee(ctx: SessionContext, refuse: boolean): Promise<BillView> {
        if (refuse && !(await this.restaurants.get(ctx.restaurantId)).guestFeeRefusal)
            throw new FeeRefusalDisabledException();
        const session = await this.sessions.findOne({ where: { id: ctx.sessionId } });
        if (!session) throw new TableSessionNotFoundException();
        if (refuse) session.feeWaivedBy ??= 'customer';
        else if (session.feeWaivedBy === 'customer') session.feeWaivedBy = null;
        await this.sessions.save(session);
        return this.changed(ctx.restaurantId, ctx.tableId);
    }

    public async addAdjustment(
        rid: string,
        tableId: string,
        dto: AdjustmentDTO,
        by: string
    ): Promise<BillView> {
        if (dto.cents === 0) throw new ZeroAdjustmentException();
        const session = await this.requireSession(rid, tableId);
        if (session.adjustments.length >= MAX_BILL_ADJUSTMENTS)
            throw new TooManyAdjustmentsException();
        session.adjustments = [
            ...session.adjustments,
            {
                label: dto.label.trim(),
                cents: dto.cents,
                reason: dto.reason?.trim() || null,
                by,
                createdAt: new Date().toISOString()
            }
        ];
        await this.sessions.save(session);
        return this.changed(rid, tableId);
    }

    public async removeAdjustment(
        rid: string,
        tableId: string,
        index: number
    ): Promise<BillView> {
        const session = await this.requireSession(rid, tableId);
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= session.adjustments.length
        ) {
            throw new ResourceNotFoundException();
        }
        session.adjustments = session.adjustments.filter((_, i) => i !== index);
        await this.sessions.save(session);
        return this.changed(rid, tableId);
    }

    private async requireSession(
        rid: string,
        tableId: string
    ): Promise<TableSessionEntity> {
        await this.tables.get(rid, tableId);
        const session = await this.tables.activeSessionOf(tableId);
        if (!session) throw new NoActiveSessionException();
        return session;
    }

    private async changed(rid: string, tableId: string): Promise<BillView> {
        this.realtime.publish({
            type: 'bill.updated',
            restaurantId: rid,
            tableId,
            payload: { tableId }
        });
        return this.view(rid, tableId);
    }

    private async build(rid: string, table: DiningTableEntity): Promise<BillView> {
        const [restaurant, session] = await Promise.all([
            this.restaurants.get(rid),
            this.tables.activeSessionOf(table.id)
        ]);
        const orders = session ? await this.orders.billable(rid, session.id) : [];
        const lines = orders.flatMap((o) =>
            o.items.map((i) => ({
                name: i.name,
                unitCents: i.unitCents,
                quantity: i.quantity,
                details: summarizeOptions(i.options).map((g) => `${g.group}: ${g.text}`)
            }))
        );
        const adjustments = session?.adjustments ?? [];
        const feeWaivedBy: FeeWaivedBy | null = session?.feeWaivedBy ?? null;
        const bill = calculateBill(
            lines,
            restaurant.serviceFeeBps,
            feeWaivedBy !== null,
            adjustments
        );
        return {
            tableId: table.id,
            tableName: table.name,
            state: table.state,
            serviceFeeBps: restaurant.serviceFeeBps,
            feeWaivedBy,
            guestCanRefuseFee: restaurant.guestFeeRefusal,
            lines,
            adjustments: adjustments.map(({ label, cents, reason, createdAt }) => ({
                label,
                cents,
                reason,
                createdAt
            })),
            ...bill
        };
    }
}
