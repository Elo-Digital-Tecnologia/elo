import type { OrderStatus } from '@elo/core/orders/order-status';
import type { OrderItem } from '../types/order-item.type.js';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class OrderResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public restaurantId: string;

    @Expose()
    public tableId: string;

    @Expose()
    public sessionId: string;

    @Expose()
    public status: OrderStatus;

    @Expose()
    public items: Array<OrderItem>;

    @Expose()
    public cancelReason: string | null;

    @Expose()
    public createdAt: Date;

    @Expose()
    public tableName?: string | undefined;

    public static from(source: OrderResponseDTO): OrderResponseDTO {
        return plainToInstance(OrderResponseDTO, source);
    }
}
