import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TableSession } from './table-session.entity';

/**
 * A guest's device that asked for news about its order. Bound to the table session
 * and erased when the table closes: no name, contact or device details are kept.
 */
@Entity('guest_push_subscriptions')
export class GuestPushSubscription {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Index() @Column({ type: 'uuid' }) tableId: string;
  @Column({ type: 'uuid' }) sessionId: string;
  @ManyToOne(() => TableSession, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'session_id' }) session?: TableSession;
  @Column({ type: 'text', unique: true }) endpoint: string;
  @Column({ type: 'varchar', length: 120 }) p256dh: string;
  @Column({ type: 'varchar', length: 60 }) auth: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
