import type { OptionGroup } from '@elo/core/api/views/catalog.view';
import type { ProductTag } from '@elo/core/catalog/product-tags';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('products')
export class ProductEntity {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Index()
    @Column({ name: 'restaurant_id', type: 'uuid' })
    public restaurantId: string;

    @Column({ name: 'category_id', type: 'uuid' })
    public categoryId: string;

    @Column({ name: 'name', type: 'varchar', length: 120 })
    public name: string;

    @Column({ name: 'description', type: 'text', nullable: true })
    public description: string | null;

    @Column({ name: 'price_cents', type: 'int' })
    public priceCents: number;

    @Column({ name: 'image_url', type: 'text', nullable: true })
    public imageUrl: string | null;

    @Column({ name: 'available', type: 'boolean', default: true })
    public available: boolean;

    /** Shown in the menu's "Featured" section. */
    @Column({ name: 'featured', type: 'boolean', default: false })
    public featured: boolean;

    @Column({ name: 'tags', type: 'text', array: true, default: '{}' })
    public tags: ProductTag[];

    /** Ordem dentro da categoria (menor primeiro). */
    @Column({ name: 'position', type: 'int', default: 0 })
    public position: number;

    @Column({ name: 'options', type: 'jsonb', default: () => "'[]'" })
    public options: OptionGroup[];

    /** Pizza flavor: its price by size id of the category. */
    @Column({ name: 'size_prices', type: 'jsonb', default: () => "'{}'" })
    public sizePrices: Record<string, number>;
}
