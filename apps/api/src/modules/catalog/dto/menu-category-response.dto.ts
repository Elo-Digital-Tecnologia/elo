import type { CategoryView, PizzaSetup } from '@elo/core/api/views/catalog.view';
import type { CategoryKind } from '@elo/core/catalog/category-kinds';
import type { ProductEntity } from '../entities/product.entity.js';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class MenuCategoryResponseDTO implements CategoryView {
    @Expose()
    public products: Array<ProductEntity>;

    @Expose()
    public id: string;

    @Expose()
    public restaurantId: string;

    @Expose()
    public name: string;

    @Expose()
    public position: number;

    @Expose()
    public kind: CategoryKind;

    @Expose()
    public pizza: PizzaSetup | null;

    public static from(source: MenuCategoryResponseDTO): MenuCategoryResponseDTO {
        return plainToInstance(MenuCategoryResponseDTO, source);
    }
}
