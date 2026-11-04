import { CREDENTIAL_INPUT_LIMITS, FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsString, MaxLength } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class ChangePasswordDTO {
    /** Only checked against the stored hash: a wrong one answers 401 whatever its size. */
    @IsString()
    @MaxLength(CREDENTIAL_INPUT_LIMITS.password)
    public current: string;

    @Field(FIELD_RULES.password)
    public next: string;
}
