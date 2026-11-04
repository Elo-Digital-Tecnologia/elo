import type { OrderHistoryItem, OrderHistoryPage } from '@elo/core/api/views/order.view';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class OrderHistoryPageResponseDTO implements OrderHistoryPage {
    @Expose()
    public items: Array<OrderHistoryItem>;

    @Expose()
    public total: number;

    @Expose()
    public page: number;

    @Expose()
    public pageSize: number;

    @Expose()
    public limitedFrom: string | null;

    public static from(source: OrderHistoryPageResponseDTO): OrderHistoryPageResponseDTO {
        return plainToInstance(OrderHistoryPageResponseDTO, source);
    }
}
