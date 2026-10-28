import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '@elo/core';

@Entity('staff_users')
@Index('UQ_staff_restaurant_username', ['restaurantId', 'username'], { unique: true, where: '"restaurant_id" IS NOT NULL' })
@Index('UQ_staff_elo_username', ['username'], { unique: true, where: '"restaurant_id" IS NULL' })
export class StaffUser {
  @PrimaryGeneratedColumn('uuid') id: string;
  /** Nulo para equipe Elo Digital. */
  @Index() @Column({ type: 'uuid', nullable: true }) restaurantId: string | null;
  /** Único dentro do restaurante (ou entre a equipe Elo, quando restaurantId é nulo). */
  @Column() username: string;
  @Column() passwordHash: string;
  @Column({ type: 'varchar' }) role: Role;
  @Column({ type: 'text', array: true, default: '{}' }) permissions: string[];
  @Column({ default: true }) active: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
