import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { PauseKind } from '@elo/core';
import { Restaurant } from './restaurant.entity';

/**
 * A window over the opening hours: a temporary closure (no new tables; `endsAt` null
 * lasts until someone ends it) or an extra opening outside the hours (always with an end).
 */
@Entity('restaurant_pauses')
@Index('IDX_restaurant_pauses_restaurant_start', ['restaurantId', 'startsAt'])
export class RestaurantPause {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) restaurantId: string;
  @Column({ type: 'varchar', length: 20, default: 'closure' }) kind: PauseKind;
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'restaurant_id' }) restaurant?: Restaurant;
  @Column({ type: 'timestamptz' }) startsAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) endsAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) endedAt: Date | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) reason: string | null;
  @Column({ type: 'varchar', length: 80 }) createdBy: string;
  @Column({ type: 'varchar', length: 120 }) createdByName: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
