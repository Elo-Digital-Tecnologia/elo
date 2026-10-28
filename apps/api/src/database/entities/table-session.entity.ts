import { FeeWaivedBy } from '@elo/core';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface StoredAdjustment {
  label: string;
  cents: number;
  reason: string | null;
  by: string;
  createdAt: string;
}

/** Sessão do cliente na mesa (cookie). Não é o mesmo mecanismo do JWT de funcionários. */
@Entity('table_sessions')
export class TableSession {
  /** Valor opaco e aleatório enviado no cookie. */
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) restaurantId: string;
  @Index() @Column({ type: 'uuid' }) tableId: string;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) closedAt: Date | null;
  /** Taxa de serviço removida: pelo cliente (recusa) ou por funcionário. */
  @Column({ type: 'varchar', nullable: true }) feeWaivedBy: FeeWaivedBy | null;
  /** Ajustes manuais da conta (desconto/acréscimo), feitos por garçom ou caixa. */
  @Column({ type: 'jsonb', default: () => "'[]'" }) adjustments: StoredAdjustment[];
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
