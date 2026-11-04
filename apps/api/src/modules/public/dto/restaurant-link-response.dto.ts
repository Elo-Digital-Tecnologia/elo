import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class RestaurantLinkResponseDTO {
    @Expose()
    public slug: string;

    public static from(source: RestaurantLinkResponseDTO): RestaurantLinkResponseDTO {
        return plainToInstance(RestaurantLinkResponseDTO, source);
    }
}
