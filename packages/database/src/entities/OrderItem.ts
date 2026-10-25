import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Order } from './Order';

export enum OrderItemStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  CANCELLED = 'cancelled'
}

@Entity('order_items')
@Index(['orderId'])
@Index(['productId'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'product_name', length: 100 })
  productName: string;

  @Column({ name: 'product_price', type: 'int' })
  productPrice: number; // in cents at time of order

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'selected_options', type: 'jsonb', default: [] })
  selectedOptions: SelectedOption[];

  @Column({ name: 'total_price', type: 'int' })
  totalPrice: number; // in cents

  @Column({ type: 'enum', enum: OrderItemStatus, default: OrderItemStatus.PENDING })
  status: OrderItemStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}

export interface SelectedOption {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceName: string;
  choicePrice: number;
}