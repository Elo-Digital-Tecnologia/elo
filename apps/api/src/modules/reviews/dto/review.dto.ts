import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsInt, Max, Min } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class ReviewDTO {
    @IsInt()
    @Min(1)
    @Max(5)
    public stars: number;

    @Field(FIELD_RULES.reviewComment, { optional: true })
    public comment?: string | null;
}
