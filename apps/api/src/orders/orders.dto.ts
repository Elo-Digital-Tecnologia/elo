import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { FIELD_RULES, OrderStatus } from '@elo/core';
import { Field, IsDay } from '../common/validation';

export class ChosenOptionDto {
  @Field(FIELD_RULES.optionName) group: string;
  @Field(FIELD_RULES.optionName) label: string;
}

export class OrderItemDto {
  @IsUUID() productId: string;
  @IsInt() @Min(1) @Max(50) quantity: number;
  @Field(FIELD_RULES.orderNotes, { optional: true }) notes?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ChosenOptionDto)
  options?: ChosenOptionDto[];
}

export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class AdvanceOrderDto {
  @IsIn([OrderStatus.Received, OrderStatus.Preparing, OrderStatus.Ready]) status: OrderStatus;
}

export class CancelStaffDto {
  @Field(FIELD_RULES.reason) reason: string;
}

export class CancelCustomerDto {
  @Field(FIELD_RULES.optionalReason, { optional: true }) reason?: string | null;
}

/** Filtros de GET /orders. `status` aceita lista separada por vírgula. */
export class ListOrdersQuery {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(Object.values(OrderStatus), { each: true })
  status?: OrderStatus[];

  @IsOptional() @IsDay() from?: string;
  @IsOptional() @IsDay() to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;

  /** Only orders of guests still at their tables (session not closed), for the floor. */
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() open?: boolean;
}

/** Filters of GET /orders/history: a period (YYYY-MM-DD, restaurant days), statuses, a table and the page. */
export class OrderHistoryQuery {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(Object.values(OrderStatus), { each: true })
  status?: OrderStatus[];

  @IsOptional() @IsDay() from?: string;
  @IsOptional() @IsDay() to?: string;
  @IsOptional() @IsUUID() tableId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page?: number;
}
