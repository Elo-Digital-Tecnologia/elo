import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
    ValidateNested
} from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { ORDER_LIMITS } from '../order.constants.js';
import { ChosenOptionDTO } from './chosen-option.dto.js';
import { OrderPizzaDTO } from './order-pizza.dto.js';

export class OrderItemDTO {
    @IsUUID()
    public productId: string;

    @IsInt()
    @Min(1)
    @Max(ORDER_LIMITS.quantityPerItem)
    public quantity: number;

    @Field(FIELD_RULES.orderNotes, { optional: true })
    public notes?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(ORDER_LIMITS.optionsPerItem)
    @ValidateNested({ each: true })
    @Type(() => ChosenOptionDTO)
    public options?: ChosenOptionDTO[];

    /** Required when the product is a flavor of a pizza category; `options` then holds its add-ons. */
    @IsOptional()
    @ValidateNested()
    @Type(() => OrderPizzaDTO)
    public pizza?: OrderPizzaDTO;
}
