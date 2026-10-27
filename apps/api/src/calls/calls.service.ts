import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRepo } from '../common/tenant-repo';
import { WaiterCall } from '../database/entities';
import { RealtimeService } from '../realtime/realtime.service';
import { SessionContext, TablesService } from '../tables/tables.service';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(WaiterCall) private readonly calls: Repository<WaiterCall>,
    private readonly tables: TablesService,
    private readonly realtime: RealtimeService,
  ) {}

  private scoped(rid: string) {
    return new TenantRepo(this.calls, rid);
  }

  /** Idempotente: se já há chamado pendente da mesa, devolve o mesmo. */
  async create(ctx: SessionContext): Promise<WaiterCall> {
    const repo = this.scoped(ctx.restaurantId);
    const open = (await repo.find({ tableId: ctx.tableId })).find((c) => !c.resolvedAt);
    if (open) return open;
    const call = await repo.create({ tableId: ctx.tableId, resolvedAt: null });
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

  async resolve(rid: string, id: string) {
    const repo = this.scoped(rid);
    const call = await repo.findOne({ id });
    if (!call) throw new NotFoundException();
    call.resolvedAt ??= new Date();
    const saved = await repo.save(call);
    this.realtime.publish({
      type: 'call.resolved',
      restaurantId: rid,
      tableId: call.tableId,
      payload: { id: saved.id },
    });
    return saved;
  }
}
