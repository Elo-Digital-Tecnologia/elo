import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class CreateTableDTO {
    @Field(FIELD_RULES.tableName)
    public name: string;
}
