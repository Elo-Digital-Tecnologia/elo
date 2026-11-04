import type {
    RestaurantListItem,
    RestaurantListView
} from '@elo/core/api/views/restaurant.view';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class RestaurantListResponseDTO implements RestaurantListView {
    @Expose()
    public items: Array<RestaurantListItem>;

    @Expose()
    public total: number;

    @Expose()
    public page: number;

    @Expose()
    public pageSize: number;

    @Expose()
    public counts: {
        all: number;
        active: number;
        grace: number;
        suspended: number;
        pending: number;
        ended: number;
        deleted?: number | undefined;
    };

    public static from(source: RestaurantListResponseDTO): RestaurantListResponseDTO {
        return plainToInstance(RestaurantListResponseDTO, source);
    }
}
