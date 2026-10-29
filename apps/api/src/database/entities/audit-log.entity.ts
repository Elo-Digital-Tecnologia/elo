import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { ActorKind } from '@elo/core';

/** Activity record: who did what, in which restaurant. Read by the restaurant's log and by Elo support. */
@Entity('audit_log')
@Index('IDX_audit_log_restaurant_created', ['restaurantId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  /** 'superadmin', 'system' or a user id (for Elo support inside a restaurant, the Elo member's id). */
  @Column() actor: string;
  /** Name at the time of the action, so the record still reads well after renames or archiving. */
  @Column({ type: 'varchar', nullable: true }) actorName: string | null;
  @Column({ type: 'varchar', nullable: true }) actorKind: ActorKind | null;
  @Column() action: string;
  @Index() @Column({ type: 'uuid', nullable: true }) restaurantId: string | null;
  @Column({ type: 'varchar', nullable: true }) target: string | null;
  @Column({ type: 'jsonb', nullable: true }) meta: Record<string, unknown> | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
