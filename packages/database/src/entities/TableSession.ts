import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { Table } from './Table';
import { Order } from './Order';

@Entity('table_sessions')
@Index(['token'], { unique: true })
@Index(['tableId', 'isActive'])
@Index(['expiresAt'])
export class TableSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  tableId: string;

  @Column({ length: 64 })
  token: string; // session token (short-lived, in cookie)

  @Column({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Table, table => table.session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @OneToMany(() => Order, order => order.session)
  orders: Order[];
}