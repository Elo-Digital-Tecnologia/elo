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
import { Restaurant } from './Restaurant';
import { Table } from './Table';

export enum CallStatus {
  PENDING = 'pending',
  RESPONDED = 'responded',
  CANCELLED = 'cancelled'
}

@Entity('calls_waiter')
@Index(['restaurantId', 'status'])
@Index(['tableId', 'status'])
@Index(['createdAt'])
export class CallWaiter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Column({ name: 'table_id' })
  tableId: string;

  @Column({ name: 'table_name', length: 50 })
  tableName: string;

  @Column({ type: 'enum', enum: CallStatus, default: CallStatus.PENDING })
  status: CallStatus;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @Column({ name: 'responded_by', type: 'varchar', length: 36, nullable: true })
  respondedBy: string | null;

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
}