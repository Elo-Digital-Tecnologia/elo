import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SLUG_PATTERN } from '@elo/core';

export class CreateRestaurantDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @Matches(SLUG_PATTERN) @MaxLength(60) slug?: string;
  @IsString() @MinLength(2) @MaxLength(120) managerName: string;
  @IsString() @MinLength(5) @MaxLength(120) managerContact: string;
  @Type(() => Date) @IsDate() dueDate: Date;
  @IsOptional() @IsInt() @Min(0) @Max(3000) serviceFeeBps?: number;
  @IsString() @MinLength(3) @MaxLength(64) @Matches(/^[a-z0-9._-]+$/) adminUsername: string;
  @IsString() @MinLength(8) @MaxLength(128) adminPassword: string;
}

export class RecordPaymentDto {
  @IsInt() @Min(0) amountCents: number;
  @Type(() => Date) @IsDate() paidAt: Date;
  @Type(() => Date) @IsDate() newDueDate: Date;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
