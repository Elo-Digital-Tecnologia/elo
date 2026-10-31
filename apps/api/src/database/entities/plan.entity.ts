import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Subscription plan sold by Elo Digital. A plan in use is deactivated, never deleted. */
@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 60 }) name: string;
  @Column({ type: 'int' }) priceCents: number;
  @Column({ type: 'int', default: 1 }) cycleMonths: number;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
