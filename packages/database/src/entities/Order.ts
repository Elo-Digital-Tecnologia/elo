import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  OneToOne
} from 'typeorm';
import { Restaurant } from './Restaurant';
import { Table } from './Table';
import { TableSession } from './TableSession';
import { OrderItem } from './OrderItem';
import { OrderStatusHistory } from './OrderStatusHistory';

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING_VALIDATION = 'pending_validation',
  SENT = 'sent',
  RECEIVED = 'received',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  CLOSED = 'closed'
}

@Entity('orders')
@Index(['restaurantId', 'status'])
@Index(['tableId', 'status'])
@Index(['sessionId', 'status'])
@Index(['createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Column({ name: 'table_id' })
  tableId: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.DRAFT })
  status: OrderStatus;

  @Column({ type: 'int', default: 0 })
  subtotal: number; // in cents

  @Column({ name: 'service_charge', type: 'int', default: 0 })
  serviceCharge: number; // in cents

  @Column({ type: 'int', default: 0 })
  discount: number; // in cents

  @Column({ type: 'int', default: 0 })
  total: number; // in cents

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'sent_to_kitchen_at', type: 'timestamp', nullable: true })
  sentToKitchenAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Restaurant, restaurant => restaurant.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToOne(() => Table, table => table.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @ManyToOne(() => TableSession, session => session.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: TableSession;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];

  @OneToMany(() => OrderStatusHistory, history => history.order)
  statusHistory: OrderStatusHistory[];
}