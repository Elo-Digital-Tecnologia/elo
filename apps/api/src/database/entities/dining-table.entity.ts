import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TableState } from '@elo/core';

@Entity('dining_tables')
export class DiningTable {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Column() name: string;
  /** Token permanente, aleatório e longo. Nunca aparece o número da mesa na URL. */
  @Column({ unique: true }) token: string;
  @Column({ type: 'varchar', default: 'closed' }) state: TableState;
  /** Garçom que validou a abertura (atende a mesa). */
  @Column({ type: 'uuid', nullable: true }) waiterId: string | null;
}
