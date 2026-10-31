import type { ContractKind, ContractOrigin } from '@elo/core';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from './document.entity';
import { Restaurant } from './restaurant.entity';

/**
 * A signed agreement with a restaurant. Conversions and renewals add a new row (with
 * its own signed file), so the history of contracts is never rewritten.
 */
@Entity('contracts')
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
  @Column({ type: 'varchar', length: 80 }) signatoryName: string;
  @Column({ type: 'varchar', length: 80 }) signatoryRole: string;
  @Column({ type: 'varchar', length: 120 }) signatoryContact: string;
  @Column({ type: 'uuid' }) documentId: string;
  @ManyToOne(() => Document, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'document_id' }) document?: Document;
  @Column({ type: 'varchar', length: 80 }) createdBy: string;
  @Column({ type: 'varchar', length: 120 }) createdByName: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
