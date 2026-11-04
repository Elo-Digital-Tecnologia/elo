import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class CancelCustomerDTO {
    @Field(FIELD_RULES.optionalReason, { optional: true })
    public reason?: string | null;
}
