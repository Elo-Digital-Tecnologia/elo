import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) slug: string;
  @Column() name: string;
  /** LGPD: apenas nome e contato do gerente. */
  @Column() managerName: string;
  @Column() managerContact: string;
  @Column({ type: 'timestamptz' }) dueDate: Date;
  @Column({ default: false }) suspended: boolean;
  /** Taxa de serviço em pontos-base (1000 = 10%). */
  @Column({ type: 'int', default: 1000 }) serviceFeeBps: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
