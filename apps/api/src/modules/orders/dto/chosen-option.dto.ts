import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class ChosenOptionDTO {
    @Field(FIELD_RULES.optionName)
    public group: string;

    @Field(FIELD_RULES.optionName)
    public label: string;
}
