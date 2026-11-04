import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ORDER_LIMITS } from '../order.constants.js';
import { OrderItemDTO } from './order-item.dto.js';

export class CreateOrderDTO {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(ORDER_LIMITS.itemsPerOrder)
    @ValidateNested({ each: true })
    @Type(() => OrderItemDTO)
    public items: OrderItemDTO[];
}
