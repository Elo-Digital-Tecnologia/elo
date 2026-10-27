import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Registro manual de pagamento de assinatura. */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Column({ type: 'int' }) amountCents: number;
  @Column({ type: 'timestamptz' }) paidAt: Date;
  @Column({ type: 'timestamptz' }) newDueDate: Date;
  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ type: 'uuid' }) recordedBy: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
