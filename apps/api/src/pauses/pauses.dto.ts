import type { PauseKind } from '@elo/core';
import { FIELD_RULES } from '@elo/core';
import { Type } from 'class-transformer';
import { IsISO8601, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Field } from '../common/validation';

export class CreatePauseDto {
    /** Omitted: a closure. `opening` opens outside the hours and needs an end. */
    @IsOptional() @IsIn(['closure', 'opening']) kind?: PauseKind;
    /** Omitted: starts now. */
    @IsOptional() @IsISO8601({ strict: true }) startsAt?: string;
    /** Omitted or null: lasts until someone ends it. */
    @IsOptional() @IsISO8601({ strict: true }) endsAt?: string | null;
    @Field(FIELD_RULES.pauseReason, { optional: true }) reason?: string | null;
}

export class PauseListQuery {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page?: number;
}
