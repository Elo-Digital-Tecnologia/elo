import { OrderStatus } from '@elo/core/orders/order-status';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    Max,
    Min
} from 'class-validator';
import { IsDay } from '#/common/decorators/is-day.decorator.js';
import { ORDER_LIMITS } from '../order.constants.js';

/** Filters of GET /orders. `status` takes a comma separated list. */
export class ListOrdersQueryDTO {
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.split(',').filter(Boolean) : value
    )
    @IsArray()
    @ArrayMaxSize(6)
    @IsIn(Object.values(OrderStatus), { each: true })
    public status?: OrderStatus[];

    @IsOptional()
    @IsDay()
    public from?: string;

    @IsOptional()
    @IsDay()
    public to?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(ORDER_LIMITS.listMax)
    public limit?: number;

    /** Only orders of guests still at their tables (session not closed), for the floor. */
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    public open?: boolean;
}
