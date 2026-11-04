import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class ResetPasswordDTO {
    @Field(FIELD_RULES.password)
    public password: string;
}
