import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsObject } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class PizzaAddonChoiceDTO {
    @Field(FIELD_RULES.optionName)
    public label: string;

    /** Price by size id. Checked against the sizes by the service. */
    @IsObject()
    public sizePrices: Record<string, number>;
}
