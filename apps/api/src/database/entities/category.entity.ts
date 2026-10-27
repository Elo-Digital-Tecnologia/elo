import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Column() name: string;
  @Column({ type: 'int', default: 0 }) position: number;
}
