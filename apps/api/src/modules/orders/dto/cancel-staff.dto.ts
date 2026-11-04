import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class CancelStaffDTO {
    @Field(FIELD_RULES.reason)
    public reason: string;
}
