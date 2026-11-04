import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class CategoryDTO {
    @Field(FIELD_RULES.categoryName)
    public name: string;

    @Field(FIELD_RULES.position, { optional: true })
    public position?: number;
}
