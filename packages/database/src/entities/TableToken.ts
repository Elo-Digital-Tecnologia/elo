import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Table } from './Table';

@Entity('table_tokens')
@Index(['token'], { unique: true })
@Index(['isActive'])
export class TableToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  tableId: string;

  @Column({ length: 64 })
  token: string; // permanent alphanumeric token

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Table, table => table.token, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table: Table;
}