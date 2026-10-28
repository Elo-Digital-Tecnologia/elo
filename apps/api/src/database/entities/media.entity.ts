import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Imagem do banco do restaurante. Os arquivos ficam em disco, com o id como nome. */
@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Column({ type: 'varchar', length: 120 }) originalName: string;
  @Column({ type: 'int' }) width: number;
  @Column({ type: 'int' }) height: number;
  /** Tamanho do arquivo principal em bytes. */
  @Column({ type: 'int' }) bytes: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
