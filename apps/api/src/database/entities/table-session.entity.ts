import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Sessão do cliente na mesa (cookie). Não é o mesmo mecanismo do JWT de funcionários. */
@Entity('table_sessions')
export class TableSession {
  /** Valor opaco e aleatório enviado no cookie. */
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) restaurantId: string;
  @Index() @Column({ type: 'uuid' }) tableId: string;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) closedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
