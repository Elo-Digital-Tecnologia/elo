import type { ActorKind } from '@elo/core/activity/activity-actions';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';

/** Activity record: who did what, in which restaurant. Read by the restaurant's log and by Elo support. */
@Entity('audit_logs')
@Index('IDX_audit_log_restaurant_created', ['restaurantId', 'createdAt'])
export class AuditLogEntity extends BaseEntity {
    /** 'superadmin', 'system' or a user id (for Elo support inside a restaurant, the Elo member's id). */
    @Column({ name: 'actor', type: 'varchar' })
    public actor: string;

    /** Name at the time of the action, so the record still reads well after renames or archiving. */
    @Column({ name: 'actor_name', type: 'varchar', nullable: true })
    public actorName: string | null;

    @Column({ name: 'actor_kind', type: 'varchar', nullable: true })
    public actorKind: ActorKind | null;

    @Column({ name: 'action', type: 'varchar' })
    public action: string;

    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid', nullable: true })
    public restaurantId: string | null;

    @Column({ name: 'target', type: 'varchar', nullable: true })
    public target: string | null;

    @Column({ name: 'meta', type: 'jsonb', nullable: true })
    public meta: Record<string, unknown> | null;
}
