import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';

/**
 * A private file the Elo team keeps for a restaurant (proof of payment, signed
 * contract). Stored outside the public media folder and served only to the team.
 */
@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'restaurant_id' }) restaurant?: Restaurant;
  @Column({ type: 'varchar', length: 20 }) kind: 'receipt' | 'contract';
  @Column({ type: 'varchar', length: 120 }) originalName: string;
  @Column({ type: 'varchar', length: 40 }) mime: string;
  @Column({ type: 'int' }) bytes: number;
  @Column({ type: 'varchar', length: 64 }) sha256: string;
  @Column({ type: 'varchar', length: 80 }) uploadedBy: string;
  @Column({ type: 'varchar', length: 120 }) uploadedByName: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
