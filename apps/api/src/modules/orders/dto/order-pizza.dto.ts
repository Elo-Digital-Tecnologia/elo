import { FLAVORS_MAX } from '@elo/core/catalog/option-kinds';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** A pizza put together by the guest: the size and its flavors, from one pizza category. */
export class OrderPizzaDTO {
    @IsUUID()
    public sizeId: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(FLAVORS_MAX)
    @IsUUID('all', { each: true })
    public flavorIds: string[];
}
