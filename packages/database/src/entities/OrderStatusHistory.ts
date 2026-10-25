import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Order } from './Order';

@Entity('order_status_history')
@Index(['orderId', 'createdAt'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'from_status', length: 30 })
  fromStatus: string;

  @Column({ name: 'to_status', length: 30 })
  toStatus: string;

  @Column({ name: 'changed_by', length: 36 })
  changedBy: string; // user ID or 'system' or 'client'

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Order, order => order.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}