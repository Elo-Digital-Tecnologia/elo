import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
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
