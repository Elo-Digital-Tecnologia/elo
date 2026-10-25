import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Bill } from './Bill';
import { OrderItem } from './OrderItem';

@Entity('bill_items')
@Index(['billId'])
@Index(['orderItemId'])
export class BillItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bill_id' })
  billId: string;

  @Column({ name: 'order_item_id' })
  orderItemId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'int' })
  totalPrice: number;

  @Column({ name: 'assigned_to', type: 'varchar', length: 36, nullable: true })
  assignedTo: string | null; // user ID for by-item split

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Bill, bill => bill.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  bill: Bill;

  @ManyToOne(() => OrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;
}