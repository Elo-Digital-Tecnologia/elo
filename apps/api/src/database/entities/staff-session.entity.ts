import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { StaffUser } from './staff-user.entity';

/**
 * A signed-in device of a staff member (or of the superadmin, without a user). The
 * browser keeps a random token in an httpOnly cookie and trades it for short access
 * tokens; only its hash is stored here.
 */
@Entity('staff_sessions')
@Unique('UQ_staff_sessions_token_hash', ['tokenHash'])
export class StaffSession {
  @PrimaryGeneratedColumn('uuid') id: string;
  /** Null for the superadmin. */
  @Index('IDX_staff_sessions_user_id') @Column({ type: 'uuid', nullable: true }) userId: string | null;
  @ManyToOne(() => StaffUser, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_staff_sessions_user' }) user?: StaffUser;
  /** `admin` or `r:<slug>`, the panel it was opened in. */
  @Column({ type: 'varchar', length: 90 }) scope: string;
  @Column({ type: 'varchar', length: 64 }) tokenHash: string;
  /** Fingerprint of the password (or superadmin key) at sign-in: changing it ends the session. */
  @Column({ type: 'varchar', length: 32 }) credentialTag: string;
  @Column({ type: 'varchar', length: 200, nullable: true }) userAgent: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @Column({ type: 'timestamptz' }) lastUsedAt: Date;
  @Index('IDX_staff_sessions_expires_at') @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt: Date | null;
}
