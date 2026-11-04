import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';

@Entity('waiter_calls')
export class WaiterCallEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Column({ name: 'table_id', type: 'uuid' })
    public tableId: string;

    @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
    public resolvedAt: Date | null;

    @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
    public resolvedBy: string | null;
}
