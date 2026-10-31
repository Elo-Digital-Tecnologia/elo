import type { BillingEntryKind } from '@elo/core';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Billing history of a restaurant: payments and manual due date adjustments. The
 * restaurant's due date is the `newDueDate` of its latest entry that was not voided.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Column({ type: 'varchar', default: 'payment' }) kind: BillingEntryKind;
  @Column({ type: 'int' }) amountCents: number;
  /** What the plan asked for when the payment was recorded. */
  @Column({ type: 'int', nullable: true }) expectedCents: number | null;
  @Column({ type: 'timestamptz' }) paidAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) periodStart: Date | null;
  @Column({ type: 'timestamptz' }) newDueDate: Date;
  @Column({ type: 'uuid', nullable: true }) planId: string | null;
  @Column({ type: 'varchar', length: 60, nullable: true }) planName: string | null;
  @Column({ type: 'int', nullable: true }) cycles: number | null;
  /** For an adjustment, the reason given. */
  @Column({ type: 'text', nullable: true }) note: string | null;
  /** 'superadmin' or the Elo team member id. */
  @Column() recordedBy: string;
  @Column({ type: 'varchar', nullable: true }) recordedByName: string | null;
  @Column({ type: 'timestamptz', nullable: true }) voidedAt: Date | null;
  @Column({ type: 'varchar', nullable: true }) voidedBy: string | null;
  @Column({ type: 'varchar', nullable: true }) voidedByName: string | null;
  @Column({ type: 'text', nullable: true }) voidReason: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
