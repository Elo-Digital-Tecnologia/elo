import type { ContractKind, ContractOrigin, TrialEndReason } from '@elo/core';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Document } from './document.entity';
import { Restaurant } from './restaurant.entity';

/**
 * A signed agreement with a restaurant. Conversions and renewals add a new row (with
 * its own signed file), so the history of contracts is never rewritten.
 */
@Entity('contracts')
@Unique('UQ_contracts_document', ['documentId'])
@Index('IDX_contracts_coverage', ['restaurantId', 'startsOn', 'effectiveEndsOn'], { where: '"voided_at" IS NULL' })
export class Contract {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'restaurant_id' }) restaurant?: Restaurant;
  @Column({ type: 'varchar', length: 20 }) kind: ContractKind;
  @Column({ type: 'varchar', length: 20 }) origin: ContractOrigin;
  @Column({ type: 'uuid', nullable: true }) previousId: string | null;
  /** Calendar days, YYYY-MM-DD. */
  @Column({ type: 'date' }) signedOn: string;
  @Column({ type: 'date' }) startsOn: string;
  @Column({ type: 'date' }) endsOn: string;
  /** Last day really covered: a later conversion cuts the pilot short. Kept by ContractsService for SQL filters. */
  @Column({ type: 'date' }) effectiveEndsOn: string;
  /** Free days of a first pilot contract. */
  @Column({ type: 'int', default: 0 }) trialDays: number;
  @Column({ type: 'date', nullable: true }) trialEndedOn: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) trialEndReason: TrialEndReason | null;
  /** Plan and price as signed: later price changes of the plan do not reach this contract. */
  @Column({ type: 'uuid', nullable: true }) planId: string | null;
  @Column({ type: 'varchar', length: 60, nullable: true }) planName: string | null;
  @Column({ type: 'int', nullable: true }) priceCents: number | null;
  @Column({ type: 'int', nullable: true }) cycleMonths: number | null;
  @Column({ type: 'varchar', length: 80 }) signatoryName: string;
  @Column({ type: 'varchar', length: 80 }) signatoryRole: string;
  @Column({ type: 'varchar', length: 120 }) signatoryContact: string;
  @Column({ type: 'uuid' }) documentId: string;
  @ManyToOne(() => Document, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'document_id' }) document?: Document;
  @Column({ type: 'varchar', length: 80 }) createdBy: string;
  @Column({ type: 'varchar', length: 120 }) createdByName: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) voidedAt: Date | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) voidedBy: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) voidedByName: string | null;
  @Column({ type: 'varchar', length: 300, nullable: true }) voidReason: string | null;
}
