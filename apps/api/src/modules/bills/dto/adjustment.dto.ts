import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class AdjustmentDTO {
    @Field(FIELD_RULES.adjustmentLabel)
    public label: string;

    /** Positive adds, negative gives a discount (cents). */
    @Field(FIELD_RULES.adjustmentCents)
    public cents: number;

    @Field(FIELD_RULES.adjustmentReason, { optional: true })
    public reason?: string | null;
}
