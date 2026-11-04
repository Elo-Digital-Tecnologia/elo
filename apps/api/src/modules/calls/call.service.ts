import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UUID_PATTERN } from '#/common/constants.js';
import { TenantRepository } from '#/common/database/tenant.repository.js';
import { RealtimeService } from '#/modules/realtime/realtime.service.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { AlreadyHandledException } from '#/modules/tables/exceptions/already-handled.exception.js';
import { SessionContext, TableService } from '#/modules/tables/table.service.js';
import { WaiterCallEntity } from './entities/waiter-call.entity.js';
import { CallNotFoundException } from './exceptions/call-not-found.exception.js';

@Injectable()
export class CallService {
    constructor(
        @InjectRepository(WaiterCallEntity)
        private readonly calls: Repository<WaiterCallEntity>,
        private readonly tables: TableService,
        private readonly staff: StaffService,
        private readonly realtime: RealtimeService
    ) {}

    private scoped(rid: string) {
        return new TenantRepository(this.calls, rid);
    }

    /** Idempotent: a table with a pending call gets the same call back. */
    public async create(ctx: SessionContext): Promise<WaiterCallEntity> {
        const repo = this.scoped(ctx.restaurantId);
        const open = (await repo.find({ tableId: ctx.tableId })).find(
            (c) => !c.resolvedAt
        );
        if (open) return open;
        const call = await repo.create({
            tableId: ctx.tableId,
            resolvedAt: null,
            resolvedBy: null
        });
        const table = await this.tables.get(ctx.restaurantId, ctx.tableId);
        this.realtime.publish({
            type: 'call.created',
            restaurantId: ctx.restaurantId,
            payload: { ...call, tableName: table.name }
        });
        return call;
    }

    public async pending(rid: string) {
        const [calls, tables] = await Promise.all([
            this.scoped(rid).find({}, { createdAt: 'ASC' }),
            this.tables.list(rid)
        ]);
        const names = new Map(tables.map((t) => [t.id, t.name]));
        return calls
            .filter((c) => !c.resolvedAt)
            .map((c) => ({ ...c, tableName: names.get(c.tableId) }));
    }

    /**
     * First to answer wins, in a single guarded UPDATE. The others get 409
     * `already_handled` with the name of who took the call.
     */
    public async resolve(rid: string, id: string, actor: JwtUser) {
        const by = UUID_PATTERN.test(actor.sub) ? actor.sub : null;
        const result = await this.calls.update(
            { id, restaurantId: rid, resolvedAt: IsNull() },
            { resolvedAt: new Date(), resolvedBy: by }
        );
        const call = await this.scoped(rid).findOne({ id });
        if (!call) throw new CallNotFoundException();
        const names = await this.staff.names([call.resolvedBy]);
        if (!result.affected) {
            throw new AlreadyHandledException({
                by: names.get(call.resolvedBy ?? '')?.name ?? null
            });
        }
        this.realtime.publish({
            type: 'call.resolved',
            restaurantId: rid,
            tableId: call.tableId,
            payload: {
                id: call.id,
                handledBy: by ? { id: by, name: names.get(by)?.guestName ?? null } : null
            }
        });
        return call;
    }
}
