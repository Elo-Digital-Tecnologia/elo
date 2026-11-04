import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class OptionChoiceDTO {
    @Field(FIELD_RULES.optionName)
    public label: string;

    @Field(FIELD_RULES.priceCents)
    public priceCents: number;
}
