import { OrderStatus } from '@elo/core/orders/order-status';
import { IsIn } from 'class-validator';

export class AdvanceOrderDTO {
    @IsIn([OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.READY])
    public status: OrderStatus;
}
