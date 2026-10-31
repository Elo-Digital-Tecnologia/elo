import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';

/** A temporary closure: no new tables open while it lasts. `endsAt` null lasts until someone ends it. */
@Entity('restaurant_pauses')
@Index('IDX_restaurant_pauses_restaurant_start', ['restaurantId', 'startsAt'])
export class RestaurantPause {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) restaurantId: string;
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'restaurant_id' }) restaurant?: Restaurant;
  @Column({ type: 'timestamptz' }) startsAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) endsAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) endedAt: Date | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) reason: string | null;
  @Column({ type: 'varchar', length: 80 }) createdBy: string;
  @Column({ type: 'varchar', length: 120 }) createdByName: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
