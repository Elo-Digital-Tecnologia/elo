import { OrderStatus } from '@elo/core/orders/order-status';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsIn,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min
} from 'class-validator';
import { IsDay } from '#/common/decorators/is-day.decorator.js';
import { ORDER_LIMITS } from '../order.constants.js';

/** Filters of GET /orders/history: a period (YYYY-MM-DD, restaurant days), statuses, a table and the page. */
export class OrderHistoryQueryDTO {
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
    @IsUUID()
    public tableId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(ORDER_LIMITS.historyMaxPage)
    public page?: number;
}
