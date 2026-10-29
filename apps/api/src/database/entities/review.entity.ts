import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Avaliação do atendimento. Uma por sessão da mesa; sem nome nem telefone. */
@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Index({ unique: true }) @Column({ type: 'uuid' }) sessionId: string;
  @Column({ type: 'varchar', length: 120 }) tableName: string;
  @Column({ type: 'int' }) stars: number;
  @Column({ type: 'varchar', length: 300, nullable: true }) comment: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
