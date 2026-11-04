import type { BillingEntryKind } from '@elo/core/billing/billing';
import type { Relation } from 'typeorm';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { DocumentEntity } from '#/modules/documents/entities/document.entity.js';

/**
 * Billing history of a restaurant: payments and manual due date adjustments. The
 * restaurant's due date is the `newDueDate` of its latest entry that was not voided.
 */
@Entity('payments')
@Index('UQ_payments_receipt', ['receiptId'], {
    unique: true,
    where: '"receipt_id" IS NOT NULL'
})
export class PaymentEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Column({ name: 'kind', type: 'varchar', default: 'payment' })
    public kind: BillingEntryKind;

    @Column({ name: 'amount_cents', type: 'int' })
    public amountCents: number;

    /** What the plan asked for when the payment was recorded. */
    @Column({ name: 'expected_cents', type: 'int', nullable: true })
    public expectedCents: number | null;

    @Column({ name: 'paid_at', type: 'timestamptz' })
    public paidAt: Date;

    @Column({ name: 'period_start', type: 'timestamptz', nullable: true })
    public periodStart: Date | null;

    @Column({ name: 'new_due_date', type: 'timestamptz' })
    public newDueDate: Date;

    @Column({ name: 'plan_id', type: 'uuid', nullable: true })
    public planId: string | null;

    @Column({ name: 'plan_name', type: 'varchar', length: 60, nullable: true })
    public planName: string | null;

    @Column({ name: 'cycles', type: 'int', nullable: true })
    public cycles: number | null;

    /** For an adjustment, the reason given. */
    @Column({ name: 'note', type: 'text', nullable: true })
    public note: string | null;

    /** 'superadmin' or the Elo team member id. */
    @Column({ name: 'recorded_by', type: 'varchar' })
    public recordedBy: string;

    @Column({ name: 'recorded_by_name', type: 'varchar', nullable: true })
    public recordedByName: string | null;

    @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
    public voidedAt: Date | null;

    @Column({ name: 'voided_by', type: 'varchar', nullable: true })
    public voidedBy: string | null;

    @Column({ name: 'voided_by_name', type: 'varchar', nullable: true })
    public voidedByName: string | null;

    @Column({ name: 'void_reason', type: 'text', nullable: true })
    public voidReason: string | null;

    /** Proof of payment (a private document), or the reason there is none. */
    @Column({ name: 'receipt_id', type: 'uuid', nullable: true })
    public receiptId: string | null;

    @ManyToOne(() => DocumentEntity, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'receipt_id' })
    public receiptDocument?: Relation<DocumentEntity> | null;

    @Column({ name: 'no_receipt_reason', type: 'varchar', length: 300, nullable: true })
    public noReceiptReason: string | null;
}
