import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';
import { IsDay } from '#/common/decorators/is-day.decorator.js';

export class AdjustDueDateDTO {
    @IsDay()
    public dueDate: string;

    @Field(FIELD_RULES.reason)
    public reason: string;
}
