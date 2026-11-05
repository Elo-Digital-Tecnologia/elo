import type { PizzaSetup } from '@elo/core/api/views/catalog.view';
import { CategoryKind } from '@elo/core/catalog/category-kinds';
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

    /** Chosen when the category is created; a pizza category's products are flavors. */
    @Column({ name: 'kind', type: 'varchar', length: 16, default: CategoryKind.STANDARD })
    public kind: CategoryKind;

    /** Sizes, pricing rule and add-ons shared by the flavors of a pizza category. */
    @Column({ name: 'pizza', type: 'jsonb', nullable: true })
    public pizza: PizzaSetup | null;
}
