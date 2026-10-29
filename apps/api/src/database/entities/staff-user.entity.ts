import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '@elo/core';

@Entity('staff_users')
@Index('UQ_staff_restaurant_username', ['restaurantId', 'username'], { unique: true, where: '"restaurant_id" IS NOT NULL AND "deleted_at" IS NULL' })
@Index('UQ_staff_elo_username', ['username'], { unique: true, where: '"restaurant_id" IS NULL AND "deleted_at" IS NULL' })
export class StaffUser {
  @PrimaryGeneratedColumn('uuid') id: string;
  /** Null for the Elo Digital team. */
  @Index() @Column({ type: 'uuid', nullable: true }) restaurantId: string | null;
  /** Unique among the non-archived accounts of the restaurant (or of the Elo team). */
  @Column() username: string;
  @Column({ type: 'varchar', length: 80 }) name: string;
  /** Name shown to guests ("Ana vai até a sua mesa"). */
  @Column({ type: 'varchar', length: 30, nullable: true }) displayName: string | null;
  @Column() passwordHash: string;
  @Column({ type: 'text', array: true }) roles: Role[];
  @Column({ type: 'text', array: true, default: '{}' }) permissions: string[];
  @Column({ default: true }) active: boolean;
  /** Archived accounts keep their history (calls, tables, payments) but can no longer sign in. */
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
