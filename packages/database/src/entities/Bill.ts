import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { Restaurant } from './Restaurant';
import { Table } from './Table';
import { Order } from './Order';
import { BillItem } from './BillItem';

export enum SplitType {
  NONE = 'none',
  EQUAL = 'equal',
  BY_ITEM = 'by_item'
}

export enum BillStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

@Entity('bills')
@Index(['restaurantId', 'status'])
@Index(['tableId', 'status'])
@Index(['orderId'])
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Column({ name: 'table_id' })
  tableId: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ type: 'int', default: 0 })
  subtotal: number;

  @Column({ name: 'service_charge', type: 'int', default: 0 })
  serviceCharge: number;

  @Column({ name: 'service_charge_percentage', type: 'int', default: 10 })
  serviceChargePercentage: number;

  @Column({ type: 'int', default: 0 })
  discount: number;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ type: 'enum', enum: SplitType, default: SplitType.NONE })
  splitType: SplitType;

  @Column({ name: 'split_count', type: 'int', default: 1 })
  splitCount: number;

  @Column({ type: 'enum', enum: BillStatus, default: BillStatus.OPEN })
  status: BillStatus;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToOne(() => Table, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToMany(() => BillItem, item => item.bill)
  items: BillItem[];
}