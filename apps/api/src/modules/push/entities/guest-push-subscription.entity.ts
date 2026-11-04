import type { Relation } from 'typeorm';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';

/**
 * A guest's device that asked for news about its order. Bound to the table session
 * and erased when the table closes: no name, contact or device details are kept.
 */
@Entity('guest_push_subscriptions')
export class GuestPushSubscriptionEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Index()
    @Column({ name: 'table_id', type: 'uuid' })
    public tableId: string;

    @Column({ name: 'session_id', type: 'uuid' })
    public sessionId: string;

    @ManyToOne(() => TableSessionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    public session?: Relation<TableSessionEntity> | undefined;

    @Column({ name: 'endpoint', type: 'text', unique: true })
    public endpoint: string;

    @Column({ name: 'p256dh', type: 'varchar', length: 120 })
    public p256dh: string;

    @Column({ name: 'auth', type: 'varchar', length: 60 })
    public auth: string;
}
