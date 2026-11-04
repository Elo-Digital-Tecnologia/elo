import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';

/** A staff member's device that receives push notifications. */
@Entity('push_subscriptions')
export class PushSubscriptionEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Index()
    @Column({ name: 'staff_id', type: 'uuid' })
    public staffId: string;

    /** One row per device; signing in with another account on it moves the row. */
    @Column({ name: 'endpoint', type: 'text', unique: true })
    public endpoint: string;

    @Column({ name: 'p256dh', type: 'varchar', length: 120 })
    public p256dh: string;

    @Column({ name: 'auth', type: 'varchar', length: 60 })
    public auth: string;
}
