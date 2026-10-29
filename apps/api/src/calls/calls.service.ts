import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { JwtUser } from '../common/auth-types';
import { TenantRepo } from '../common/tenant-repo';
import { WaiterCall } from '../database/entities';
import { RealtimeService } from '../realtime/realtime.service';
import { StaffService } from '../staff/staff.service';
import { SessionContext, TablesService } from '../tables/tables.service';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(WaiterCall) private readonly calls: Repository<WaiterCall>,
    private readonly tables: TablesService,
    private readonly staff: StaffService,
    private readonly realtime: RealtimeService,
  ) {}

  private scoped(rid: string) {
    return new TenantRepo(this.calls, rid);
  }

  /** Idempotent: a table with a pending call gets the same call back. */
  async create(ctx: SessionContext): Promise<WaiterCall> {
    const repo = this.scoped(ctx.restaurantId);
    const open = (await repo.find({ tableId: ctx.tableId })).find((c) => !c.resolvedAt);
    if (open) return open;
    const call = await repo.create({ tableId: ctx.tableId, resolvedAt: null, resolvedBy: null });
    const table = await this.tables.get(ctx.restaurantId, ctx.tableId);
    this.realtime.publish({
      type: 'call.created',
      restaurantId: ctx.restaurantId,
      payload: { ...call, tableName: table.name },
    });
    return call;
  }

  async pending(rid: string) {
    const [calls, tables] = await Promise.all([this.scoped(rid).find({}, { createdAt: 'ASC' }), this.tables.list(rid)]);
    const names = new Map(tables.map((t) => [t.id, t.name]));
    return calls.filter((c) => !c.resolvedAt).map((c) => ({ ...c, tableName: names.get(c.tableId) }));
  }

  /**
   * First to answer wins, in a single guarded UPDATE. The others get 409
   * `already_handled` with the name of who took the call.
   */
  async resolve(rid: string, id: string, actor: JwtUser) {
    const by = /^[0-9a-f-]{36}$/.test(actor.sub) ? actor.sub : null;
    const result = await this.calls.update({ id, restaurantId: rid, resolvedAt: IsNull() }, { resolvedAt: new Date(), resolvedBy: by });
    const call = await this.scoped(rid).findOne({ id });
    if (!call) throw new NotFoundException();
    const names = await this.staff.names([call.resolvedBy]);
    if (!result.affected) {
      throw new ConflictException({ statusCode: 409, message: 'already_handled', by: names.get(call.resolvedBy ?? '')?.name ?? null });
    }
    this.realtime.publish({
      type: 'call.resolved',
      restaurantId: rid,
      tableId: call.tableId,
      payload: { id: call.id, handledBy: by ? { id: by, name: names.get(by)?.guestName ?? null } : null },
    });
    return call;
  }
}
