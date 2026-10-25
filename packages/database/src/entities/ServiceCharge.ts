import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Restaurant } from './Restaurant';

@Entity('service_charges')
@Index(['restaurantId'], { unique: true })
export class ServiceCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restaurant_id', unique: true })
  restaurantId: string;

  @Column({ type: 'int', default: 10 })
  percentage: number;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ length: 100, default: 'Taxa de serviço' })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
}