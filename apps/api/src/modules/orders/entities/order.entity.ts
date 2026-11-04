import { OrderStatus } from '@elo/core/orders/order-status';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { OrderItem } from '../types/order-item.type.js';

@Entity('orders')
@Index('IDX_orders_restaurant_status_created', ['restaurantId', 'status', 'createdAt'])
export class OrderEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Index()
    @Column({ name: 'table_id', type: 'uuid' })
    public tableId: string;

    @Column({ name: 'session_id', type: 'uuid' })
    public sessionId: string;

    @Column({ name: 'status', type: 'varchar', default: 'sent' })
    public status: OrderStatus;

    @Column({ name: 'items', type: 'jsonb' })
    public items: OrderItem[];

    @Column({ name: 'cancel_reason', type: 'text', nullable: true })
    public cancelReason: string | null;
}
