import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** A staff member's device that receives push notifications. */
@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Index() @Column({ type: 'uuid' }) staffId: string;
  /** One row per device; signing in with another account on it moves the row. */
  @Column({ type: 'text', unique: true }) endpoint: string;
  @Column({ type: 'varchar', length: 120 }) p256dh: string;
  @Column({ type: 'varchar', length: 60 }) auth: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
