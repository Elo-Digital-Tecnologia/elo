import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsUUID } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

/** A plan change during a contract is an amendment: it says why, and keeps the price agreed. */
export class ChangePlanDTO {
    @IsUUID()
    public planId: string;

    @Field(FIELD_RULES.reason)
    public reason: string;
}
