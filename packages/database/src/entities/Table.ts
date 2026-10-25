import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { Restaurant } from './Restaurant';
import { TableToken } from './TableToken';
import { TableSession } from './TableSession';
import { Order } from './Order';

export enum TableStatus {
  FREE = 'free',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance'
}

@Entity('tables')
@Index(['restaurantId', 'status'])
@Index(['restaurantId', 'name'])
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  number: string | null;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.FREE })
  status: TableStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Restaurant, restaurant => restaurant.tables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @OneToOne(() => TableToken, token => token.table, { onDelete: 'CASCADE' })
  token: TableToken | null;

  @OneToOne(() => TableSession, session => session.table, { onDelete: 'CASCADE' })
  session: TableSession | null;

  @OneToMany(() => Order, order => order.table)
  orders: Order[];
}