import type { OpeningHours } from '@elo/core';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Plan } from './plan.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 60, unique: true }) slug: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  /** LGPD: apenas nome e contato do gerente. */
  @Column({ type: 'varchar', length: 80 }) managerName: string;
  @Column({ type: 'varchar', length: 120 }) managerContact: string;
  /** Kept in step with the billing history by BillingService; filters and access checks read it. */
  @Column({ type: 'timestamptz' }) dueDate: Date;
  /** End of the trial: the due date while there is no billing entry. */
  @Column({ type: 'timestamptz' }) initialDueDate: Date;
  @Column({ type: 'uuid', nullable: true }) planId: string | null;
  @ManyToOne(() => Plan, { eager: true, nullable: true }) @JoinColumn({ name: 'plan_id' }) plan: Plan | null;
  @Column({ default: false }) suspended: boolean;
  /** Taxa de serviço em pontos-base (1000 = 10%). */
  @Column({ type: 'int', default: 1000 }) serviceFeeBps: number;
  /** Whether guests may take the service fee off their own bill; staff can always remove it. */
  @Column({ default: true }) guestFeeRefusal: boolean;
  @Column({ type: 'text', nullable: true }) description: string | null;
  /** /api/media/<id>.webp ou link externo. */
  @Column({ type: 'text', nullable: true }) logoUrl: string | null;
  @Column({ type: 'text', nullable: true }) coverUrl: string | null;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) instagram: string | null;
  /** Só aparece para quem está numa mesa aberta, nunca no link de consulta. */
  @Column({ type: 'varchar', length: 32, nullable: true }) wifiName: string | null;
  @Column({ type: 'varchar', length: 63, nullable: true }) wifiPassword: string | null;
  @Column({ type: 'jsonb', nullable: true }) openingHours: OpeningHours | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  /**
   * Soft delete: lookups skip the restaurant (menu, logins, sockets) while its
   * data waits for `RESTAURANT_PURGE_DAYS`. The slug stays taken until then.
   */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @Column({ type: 'varchar', nullable: true }) deletedBy: string | null;
}
