import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class CategoryEntity {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Column({ name: 'name', type: 'varchar', length: 80 })
    public name: string;

    @Column({ name: 'position', type: 'int', default: 0 })
    public position: number;
}
