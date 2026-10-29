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
  /** 'superadmin' or the Elo team member id. */
  @Column() recordedBy: string;
  @Column({ type: 'varchar', nullable: true }) recordedByName: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
