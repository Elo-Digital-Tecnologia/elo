import type { Relation } from 'typeorm';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';

/**
 * A signed-in device of a staff member (or of the superadmin, without a user). The
 * browser keeps a random token in an httpOnly cookie and trades it for short access
 * tokens; only its hash is stored here.
 */
@Entity('staff_sessions')
@Unique('UQ_staff_sessions_token_hash', ['tokenHash'])
export class StaffSessionEntity extends BaseEntity {
    /** Null for the superadmin. */
    @Index('IDX_staff_sessions_user_id')
    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    public userId: string | null;

    @ManyToOne(() => StaffUserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_staff_sessions_user' })
    public user?: Relation<StaffUserEntity> | undefined;

    /** `admin` or `r:<slug>`, the panel it was opened in. */
    @Column({ name: 'scope', type: 'varchar', length: 90 })
    public scope: string;

    @Column({ name: 'token_hash', type: 'varchar', length: 64 })
    public tokenHash: string;

    /** Fingerprint of the password (or superadmin key) at sign-in: changing it ends the session. */
    @Column({ name: 'credential_tag', type: 'varchar', length: 32 })
    public credentialTag: string;

    @Column({ name: 'user_agent', type: 'varchar', length: 200, nullable: true })
    public userAgent: string | null;

    @Column({ name: 'last_used_at', type: 'timestamptz' })
    public lastUsedAt: Date;

    @Index('IDX_staff_sessions_expires_at')
    @Column({ name: 'expires_at', type: 'timestamptz' })
    public expiresAt: Date;

    @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
    public revokedAt: Date | null;
}
