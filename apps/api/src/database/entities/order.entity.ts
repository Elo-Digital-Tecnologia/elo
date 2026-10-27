import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { OrderStatus } from '@elo/core';

export interface OrderItem {
  productId: string;
  name: string;
  unitCents: number;
  quantity: number;
  notes?: string;
  options: { group: string; label: string; priceCents: number }[];
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Index() @Column({ type: 'uuid' }) tableId: string;
  @Column({ type: 'uuid' }) sessionId: string;
  @Column({ type: 'varchar', default: 'sent' }) status: OrderStatus;
  @Column({ type: 'jsonb' }) items: OrderItem[];
  @Column({ type: 'text', nullable: true }) cancelReason: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
