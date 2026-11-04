import type { ProductView } from '@elo/core/api/views/catalog.view';
import type { OptionGroup } from '../types/option-group.type.js';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class ProductResponseDTO implements ProductView {
    @Expose()
    public id: string;

    @Expose()
    public restaurantId: string;

    @Expose()
    public categoryId: string;

    @Expose()
    public name: string;

    @Expose()
    public description: string | null;

    @Expose()
    public priceCents: number;

    @Expose()
    public imageUrl: string | null;

    @Expose()
    public available: boolean;

    @Expose()
    public featured: boolean;

    @Expose()
    public tags: Array<'vegetarian' | 'vegan' | 'gluten_free' | 'spicy' | 'new'>;

    @Expose()
    public position: number;

    @Expose()
    public options: Array<OptionGroup>;

    public static from(source: ProductResponseDTO): ProductResponseDTO {
        return plainToInstance(ProductResponseDTO, source);
    }
}
