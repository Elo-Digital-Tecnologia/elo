import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('waiter_calls')
export class WaiterCall {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Column({ type: 'uuid' }) tableId: string;
  @Column({ type: 'timestamptz', nullable: true }) resolvedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
