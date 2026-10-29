import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { type ActivityAction, type ActivityCategory, type ActivityPage, actionsIn, type ActorKind, Role } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { AuditLog, StaffUser } from '../database/entities';

export interface ActivityDetails {
  /** What the action was about, as people read it ("Mesa 07", "Ana Lima"). */
  target?: string | null;
  meta?: Record<string, unknown>;
}

/** Single entry point for the activity log, so every record carries who did it and in which restaurant. */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    @InjectRepository(StaffUser) private readonly users: Repository<StaffUser>,
  ) {}

  async record(actor: JwtUser | 'system', action: ActivityAction, restaurantId: string | null, details: ActivityDetails = {}) {
    const who = actor === 'system' ? { id: 'system', name: 'Sistema', kind: 'system' as ActorKind } : await this.who(actor);
    await this.logs.save(
      this.logs.create({
        actor: who.id,
        actorName: who.name,
        actorKind: who.kind,
        action,
        restaurantId,
        target: details.target ?? null,
        meta: details.meta ?? null,
      }),
    );
  }

  async list(restaurantId: string, opts: { category?: ActivityCategory; page?: number; pageSize?: number } = {}): Promise<ActivityPage> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 30;
    const [rows, total] = await this.logs.findAndCount({
      where: { restaurantId, ...(opts.category ? { action: In(actionsIn(opts.category)) } : {}) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        action: r.action as ActivityAction,
        actorName: r.actorName ?? (r.actor === 'superadmin' ? 'Superadmin' : 'Equipe Elo'),
        actorKind: r.actorKind ?? 'elo',
        target: r.target,
        meta: r.meta,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /** Elo support inside a restaurant is recorded as the Elo member who entered, not as the restaurant. */
  private async who(user: JwtUser): Promise<{ id: string; name: string; kind: ActorKind }> {
    const elo = !!user.impersonatedBy || user.roles.includes(Role.Superadmin) || user.roles.includes(Role.EloAdmin);
    const id = user.impersonatedBy ?? user.sub;
    let name = user.name;
    if (!name) {
      if (id === 'superadmin') name = 'Superadmin';
      else name = (await this.users.findOne({ where: { id }, select: { id: true, name: true } }).catch(() => null))?.name ?? 'Usuário';
    }
    return { id, name, kind: elo ? 'elo' : 'staff' };
  }
}
