import type { PizzaSetup } from '@elo/core/api/views/catalog.view';
import type { CategoryKind } from '@elo/core/catalog/category-kinds';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class CategoryResponseDTO {
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

    public static from(source: CategoryResponseDTO): CategoryResponseDTO {
        return plainToInstance(CategoryResponseDTO, source);
    }
}
