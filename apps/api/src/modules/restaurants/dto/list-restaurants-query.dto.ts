import type { RestaurantListStatus } from '@elo/core/api/views/restaurant.view';
import { RESTAURANT_LIST_STATUSES } from '@elo/core/api/views/restaurant.view';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { RESTAURANT_LIST_LIMITS } from '../restaurant.constants.js';

export class ListRestaurantsQueryDTO {
    @IsOptional()
    @IsString()
    @MaxLength(RESTAURANT_LIST_LIMITS.searchMaxLength)
    public q?: string;

    @IsOptional()
    @IsIn(RESTAURANT_LIST_STATUSES)
    public status?: RestaurantListStatus;

    /** Only restaurants whose payment is due within this many days. */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(RESTAURANT_LIST_LIMITS.dueWithinMaxDays)
    public dueWithin?: number;

    @IsOptional()
    @IsIn(['name', 'due', 'created'])
    public sort?: 'name' | 'due' | 'created';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(RESTAURANT_LIST_LIMITS.maxPage)
    public page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(RESTAURANT_LIST_LIMITS.minPageSize)
    @Max(RESTAURANT_LIST_LIMITS.maxPageSize)
    public pageSize?: number;
}
