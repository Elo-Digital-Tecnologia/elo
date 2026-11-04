import type { PauseKind } from '@elo/core/opening-hours/open-status';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsISO8601, IsIn, IsOptional } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class CreatePauseDTO {
    /** Omitted: a closure. `opening` opens outside the hours and needs an end. */
    @IsOptional()
    @IsIn(['closure', 'opening'])
    public kind?: PauseKind;

    /** Omitted: starts now. */
    @IsOptional()
    @IsISO8601({ strict: true })
    public startsAt?: string;

    /** Omitted or null: lasts until someone ends it. */
    @IsOptional()
    @IsISO8601({ strict: true })
    public endsAt?: string | null;

    @Field(FIELD_RULES.pauseReason, { optional: true })
    public reason?: string | null;
}
