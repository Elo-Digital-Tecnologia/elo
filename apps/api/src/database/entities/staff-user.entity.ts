import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '@elo/core';

@Entity('staff_users')
export class StaffUser {
  @PrimaryGeneratedColumn('uuid') id: string;
  /** Nulo para equipe Elo Digital. */
  @Index() @Column({ type: 'uuid', nullable: true }) restaurantId: string | null;
  @Column({ unique: true }) username: string;
  @Column() passwordHash: string;
  @Column({ type: 'varchar' }) role: Role;
  @Column({ type: 'text', array: true, default: '{}' }) permissions: string[];
  @Column({ default: true }) active: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
