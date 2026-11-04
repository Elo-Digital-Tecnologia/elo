import type {
    ContractKind,
    ContractOrigin,
    TrialEndReason
} from '@elo/core/contracts/contracts';
import type { Relation } from 'typeorm';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { DocumentEntity } from '#/modules/documents/entities/document.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';

/**
 * A signed agreement with a restaurant. Conversions and renewals add a new row (with
 * its own signed file), so the history of contracts is never rewritten.
 */
@Entity('contracts')
@Unique('UQ_contracts_document', ['documentId'])
@Index('IDX_contracts_coverage', ['restaurantId', 'startsOn', 'effectiveEndsOn'], {
    where: '"voided_at" IS NULL'
})
export class ContractEntity extends BaseEntity {
    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @ManyToOne(() => RestaurantEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'restaurant_id' })
    public restaurant?: Relation<RestaurantEntity> | undefined;

    @Column({ name: 'kind', type: 'varchar', length: 20 })
    public kind: ContractKind;

    @Column({ name: 'origin', type: 'varchar', length: 20 })
    public origin: ContractOrigin;

    @Column({ name: 'previous_id', type: 'uuid', nullable: true })
    public previousId: string | null;

    /** Calendar days, YYYY-MM-DD. */
    @Column({ name: 'signed_on', type: 'date' })
    public signedOn: string;

    @Column({ name: 'starts_on', type: 'date' })
    public startsOn: string;

    @Column({ name: 'ends_on', type: 'date' })
    public endsOn: string;

    /** Last day really covered: a later conversion cuts the pilot short. Kept by ContractsService for SQL filters. */
    @Column({ name: 'effective_ends_on', type: 'date' })
    public effectiveEndsOn: string;

    /** Free days of a first pilot contract. */
    @Column({ name: 'trial_days', type: 'int', default: 0 })
    public trialDays: number;

    @Column({ name: 'trial_ended_on', type: 'date', nullable: true })
    public trialEndedOn: string | null;

    @Column({ name: 'trial_end_reason', type: 'varchar', length: 20, nullable: true })
    public trialEndReason: TrialEndReason | null;

    /** Plan and price as signed: later price changes of the plan do not reach this contract. */
    @Column({ name: 'plan_id', type: 'uuid', nullable: true })
    public planId: string | null;

    @Column({ name: 'plan_name', type: 'varchar', length: 60, nullable: true })
    public planName: string | null;

    @Column({ name: 'price_cents', type: 'int', nullable: true })
    public priceCents: number | null;

    @Column({ name: 'cycle_months', type: 'int', nullable: true })
    public cycleMonths: number | null;

    @Column({ name: 'signatory_name', type: 'varchar', length: 80 })
    public signatoryName: string;

    @Column({ name: 'signatory_role', type: 'varchar', length: 80 })
    public signatoryRole: string;

    @Column({ name: 'signatory_contact', type: 'varchar', length: 120 })
    public signatoryContact: string;

    @Column({ name: 'document_id', type: 'uuid' })
    public documentId: string;

    @ManyToOne(() => DocumentEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'document_id' })
    public document?: Relation<DocumentEntity> | undefined;

    @Column({ name: 'created_by', type: 'varchar', length: 80 })
    public createdBy: string;

    @Column({ name: 'created_by_name', type: 'varchar', length: 120, nullable: true })
    public createdByName: string | null;

    @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
    public voidedAt: Date | null;

    @Column({ name: 'voided_by', type: 'varchar', length: 80, nullable: true })
    public voidedBy: string | null;

    @Column({ name: 'voided_by_name', type: 'varchar', length: 120, nullable: true })
    public voidedByName: string | null;

    @Column({ name: 'void_reason', type: 'varchar', length: 300, nullable: true })
    public voidReason: string | null;
}
