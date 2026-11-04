import type { OpeningHours } from '@elo/core/opening-hours/open-status';
import type { Relation } from 'typeorm';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { PlanEntity } from '#/modules/billing/entities/plan.entity.js';

@Entity('restaurants')
@Index('IDX_restaurants_deleted_at', ['deletedAt'], { where: 'deleted_at IS NOT NULL' })
export class RestaurantEntity extends BaseEntity {
    @Column({ name: 'slug', type: 'varchar', length: 60, unique: true })
    public slug: string;

    @Column({ name: 'name', type: 'varchar', length: 120 })
    public name: string;

    /** LGPD: apenas nome e contato do gerente. */
    @Column({ name: 'manager_name', type: 'varchar', length: 80 })
    public managerName: string;

    @Column({ name: 'manager_contact', type: 'varchar', length: 120 })
    public managerContact: string;

    /** Kept in step with the billing history by BillingService; filters and access checks read it. */
    @Column({ name: 'due_date', type: 'timestamptz' })
    public dueDate: Date;

    /**
     * First billed day: the start of the first contract, after its pilot's free trial.
     * The due date while there is no billing entry; meaningless before any contract.
     */
    @Column({ name: 'initial_due_date', type: 'timestamptz' })
    public initialDueDate: Date;

    @Column({ name: 'plan_id', type: 'uuid', nullable: true })
    public planId: string | null;

    @ManyToOne(() => PlanEntity, { eager: true, nullable: true, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'plan_id' })
    public plan: Relation<PlanEntity> | null;

    /**
     * An amendment that changed the plan during a contract: the price agreed then, kept as
     * it was. Null until there is one; the contract in force decides the price otherwise.
     */
    @Column({ name: 'price_cents', type: 'int', nullable: true })
    public priceCents: number | null;

    @Column({ name: 'cycle_months', type: 'int', nullable: true })
    public cycleMonths: number | null;

    @Column({ name: 'plan_amended_at', type: 'timestamptz', nullable: true })
    public planAmendedAt: Date | null;

    @Column({ name: 'suspended', type: 'boolean', default: false })
    public suspended: boolean;

    /** Service fee in basis points (1000 = 10%). */
    @Column({ name: 'service_fee_bps', type: 'int', default: 0 })
    public serviceFeeBps: number;

    /** Whether guests may take the service fee off their own bill; staff can always remove it. */
    @Column({ name: 'guest_fee_refusal', type: 'boolean', default: false })
    public guestFeeRefusal: boolean;

    @Column({ name: 'description', type: 'text', nullable: true })
    public description: string | null;

    /** /api/media/<id>.webp or an external link. */
    @Column({ name: 'logo_url', type: 'text', nullable: true })
    public logoUrl: string | null;

    @Column({ name: 'cover_url', type: 'text', nullable: true })
    public coverUrl: string | null;

    @Column({ name: 'address', type: 'text', nullable: true })
    public address: string | null;

    @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
    public phone: string | null;

    @Column({ name: 'instagram', type: 'varchar', length: 40, nullable: true })
    public instagram: string | null;

    /** Only shown to guests at an open table, never on the read-only link. */
    @Column({ name: 'wifi_name', type: 'varchar', length: 32, nullable: true })
    public wifiName: string | null;

    @Column({ name: 'wifi_password', type: 'varchar', length: 63, nullable: true })
    public wifiPassword: string | null;

    /** Where guests are invited to review the place on Google. */
    @Column({ name: 'google_review_url', type: 'varchar', length: 500, nullable: true })
    public googleReviewUrl: string | null;

    @Column({ name: 'opening_hours', type: 'jsonb', nullable: true })
    public openingHours: OpeningHours | null;

    /**
     * Soft delete: lookups skip the restaurant (menu, logins, sockets) while its
     * data waits for `RESTAURANT_PURGE_DAYS`. The slug stays taken until then.
     */
    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    public deletedAt: Date | null;

    @Column({ name: 'deleted_by', type: 'varchar', nullable: true })
    public deletedBy: string | null;
}
