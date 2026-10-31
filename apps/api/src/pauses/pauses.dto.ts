import { Transform, Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PAUSE_LIMITS } from '@elo/core';

export class CreatePauseDto {
  /** Omitted: starts now. */
  @IsOptional() @IsISO8601({ strict: true }) startsAt?: string;
  /** Omitted or null: lasts until someone ends it. */
  @IsOptional() @IsISO8601({ strict: true }) endsAt?: string | null;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsString()
  @MaxLength(PAUSE_LIMITS.reasonMax)
  reason?: string | null;
}

export class PauseListQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page?: number;
}
