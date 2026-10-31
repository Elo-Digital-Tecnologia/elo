import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '@elo/core';

export class ChosenOptionDto {
  @IsString() @MaxLength(80) group: string;
  @IsString() @MaxLength(80) label: string;
}

export class OrderItemDto {
  @IsUUID() productId: string;
  @IsInt() @Min(1) @Max(50) quantity: number;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
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
  @IsString() @MinLength(3) @MaxLength(300) reason: string;
}

export class CancelCustomerDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Filtros de GET /orders. `status` aceita lista separada por vírgula. */
export class ListOrdersQuery {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(Object.values(OrderStatus), { each: true })
  status?: OrderStatus[];

  @IsOptional() @Matches(DAY) from?: string;
  @IsOptional() @Matches(DAY) to?: string;

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

  @IsOptional() @Matches(DAY) from?: string;
  @IsOptional() @Matches(DAY) to?: string;
  @IsOptional() @IsUUID() tableId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page?: number;
}
