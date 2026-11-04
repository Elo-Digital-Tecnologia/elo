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

    public static from(source: CategoryResponseDTO): CategoryResponseDTO {
        return plainToInstance(CategoryResponseDTO, source);
    }
}
