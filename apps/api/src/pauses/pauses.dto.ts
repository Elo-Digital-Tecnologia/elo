import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { FIELD_RULES } from '@elo/core';
import { Field } from '../common/validation';

export class CreatePauseDto {
  /** Omitted: starts now. */
  @IsOptional() @IsISO8601({ strict: true }) startsAt?: string;
  /** Omitted or null: lasts until someone ends it. */
  @IsOptional() @IsISO8601({ strict: true }) endsAt?: string | null;
  @Field(FIELD_RULES.pauseReason, { optional: true }) reason?: string | null;
}

export class PauseListQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page?: number;
}
