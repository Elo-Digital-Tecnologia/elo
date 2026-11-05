import type { Availability } from '@elo/core/opening-hours/open-status';
import type { CategoryEntity } from '#/modules/catalog/entities/category.entity.js';
import type { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class PublicMenuResponseDTO {
    @Expose()
    public readOnly: boolean;

    @Expose()
    public restaurant: {
        description: string | null;
        logoUrl: string | null;
        coverUrl: string | null;
        address: string | null;
        phone: string | null;
        instagram: string | null;
        googleReviewUrl: string | null;
        availability: Availability;
        name: string;
        slug: string;
    };

    @Expose()
    public menu: Array<CategoryEntity & { products: Array<ProductEntity> }>;

    public static from(source: PublicMenuResponseDTO): PublicMenuResponseDTO {
        return plainToInstance(PublicMenuResponseDTO, source);
    }
}
