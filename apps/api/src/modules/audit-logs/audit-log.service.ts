import type {
    ActivityAction,
    ActivityCategory,
    ActivityPage,
    ActorKind
} from '@elo/core/activity/activity-actions';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { actionsIn } from '@elo/core/activity/activity-actions';
import { Role } from '@elo/core/roles/roles';
import { In, Repository } from 'typeorm';
import { SUPERADMIN_NAME } from '#/common/constants.js';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';
import { AUDIT_LOG_PAGE_SIZE } from './audit-log.constants.js';
import { AuditLogEntity } from './entities/audit-log.entity.js';

export interface ActivityDetails {
    /** What the action was about, as people read it ("Mesa 07", "Ana Lima"). */
    target?: string | null;
    meta?: Record<string, unknown> | undefined;
}

/** Single entry point for the activity log, so every record carries who did it and in which restaurant. */
@Injectable()
export class AuditLogService {
    constructor(
        @InjectRepository(AuditLogEntity)
        private readonly logs: Repository<AuditLogEntity>,
        @InjectRepository(StaffUserEntity)
        private readonly users: Repository<StaffUserEntity>
    ) {}

    public async record(
        actor: JwtUser | 'system',
        action: ActivityAction,
        restaurantId: string | null,
        details: ActivityDetails = {}
    ) {
        const who =
            actor === 'system'
                ? { id: 'system', name: null, kind: 'system' as ActorKind }
                : await this.who(actor);
        await this.logs.save(
            this.logs.create({
                actor: who.id,
                actorName: who.name,
                actorKind: who.kind,
                action,
                restaurantId,
                target: details.target ?? null,
                meta: details.meta ?? null
            })
        );
    }

    public async list(
        restaurantId: string,
        opts: { category?: ActivityCategory; page?: number; pageSize?: number } = {}
    ): Promise<ActivityPage> {
        const page = opts.page ?? 1;
        const pageSize = opts.pageSize ?? AUDIT_LOG_PAGE_SIZE;
        const [rows, total] = await this.logs.findAndCount({
            where: {
                restaurantId,
                ...(opts.category ? { action: In(actionsIn(opts.category)) } : {})
            },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * pageSize,
            take: pageSize
        });
        return {
            items: rows.map((r) => ({
                id: r.id,
                action: r.action as ActivityAction,
                actorName:
                    r.actorName ?? (r.actor === 'superadmin' ? SUPERADMIN_NAME : null),
                actorKind: r.actorKind ?? 'elo',
                target: r.target,
                meta: r.meta,
                createdAt: r.createdAt.toISOString()
            })),
            total,
            page,
            pageSize
        };
    }

    /** Elo support inside a restaurant is recorded as the Elo member who entered, not as the restaurant. */
    public async who(
        user: JwtUser
    ): Promise<{ id: string; name: string | null; kind: ActorKind }> {
        const elo =
            !!user.impersonatedBy ||
            user.roles.includes(Role.SUPERADMIN) ||
            user.roles.includes(Role.ELO_ADMIN);
        const id = user.impersonatedBy ?? user.sub;
        let name: string | null = user.name ?? null;
        if (!name) {
            if (id === 'superadmin') name = SUPERADMIN_NAME;
            else
                name =
                    (
                        await this.users
                            .findOne({ where: { id }, select: { id: true, name: true } })
                            .catch(() => null)
                    )?.name ?? null;
        }
        return { id, name, kind: elo ? 'elo' : 'staff' };
    }
}
