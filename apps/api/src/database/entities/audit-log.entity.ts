import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Registro de ações sensíveis da equipe Elo (ex.: entrada no painel de um restaurante). */
@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  /** 'superadmin' ou id do usuário da equipe Elo. */
  @Column() actor: string;
  @Column() action: string;
  @Index() @Column({ type: 'uuid', nullable: true }) restaurantId: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
