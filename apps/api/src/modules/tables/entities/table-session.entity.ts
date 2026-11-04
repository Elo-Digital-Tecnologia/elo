import { FeeWaivedBy } from '@elo/core/api/views/bill.view';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { SessionClosedReason } from '../types/session-closed-reason.type.js';
import { StoredAdjustment } from '../types/stored-adjustment.type.js';

/** Guest session at the table (cookie). Not the same mechanism as the staff JWT. */
@Entity('table_sessions')
export class TableSessionEntity extends BaseEntity {
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Index()
    @Column({ name: 'table_id', type: 'uuid' })
    public tableId: string;

    @Column({ name: 'expires_at', type: 'timestamptz' })
    public expiresAt: Date;

    @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
    public closedAt: Date | null;

    @Column({ name: 'closed_reason', type: 'varchar', nullable: true })
    public closedReason: SessionClosedReason | null;

    @Column({ name: 'open_requested_at', type: 'timestamptz', nullable: true })
    public openRequestedAt: Date | null;

    @Column({ name: 'opened_at', type: 'timestamptz', nullable: true })
    public openedAt: Date | null;

    @Column({ name: 'opened_by', type: 'uuid', nullable: true })
    public openedBy: string | null;

    @Column({ name: 'close_requested_at', type: 'timestamptz', nullable: true })
    public closeRequestedAt: Date | null;

    @Column({ name: 'closed_by', type: 'uuid', nullable: true })
    public closedBy: string | null;

    /** Service fee removed: by the guest (refusal) or by staff. */
    @Column({ name: 'fee_waived_by', type: 'varchar', nullable: true })
    public feeWaivedBy: FeeWaivedBy | null;

    /** Manual bill adjustments (discount or surcharge), made by a waiter or cashier. */
    @Column({ name: 'adjustments', type: 'jsonb', default: () => "'[]'" })
    public adjustments: StoredAdjustment[];
}
