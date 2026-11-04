import { IsUUID } from 'class-validator';
import { OrderIdsDTO } from './order-ids.dto.js';

export class ProductOrderDTO extends OrderIdsDTO {
    @IsUUID()
    public categoryId: string;
}
