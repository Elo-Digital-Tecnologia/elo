import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsObject, IsOptional } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class OptionChoiceDTO {
    @Field(FIELD_RULES.optionName)
    public label: string;

    @Field(FIELD_RULES.priceCents)
    public priceCents: number;

    /** Size of a product with flavors: how many flavors it takes. */
    @Field(FIELD_RULES.flavorsPerSize, { optional: true })
    public maxFlavors?: number;

    /** Flavor: its price for each size label. Checked against the sizes by the service. */
    @IsOptional()
    @IsObject()
    public sizePrices?: Record<string, number>;
}
