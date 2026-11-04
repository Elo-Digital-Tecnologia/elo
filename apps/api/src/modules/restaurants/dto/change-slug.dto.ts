import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

/** Deleting asks for the slug typed back, so a misclick cannot remove a restaurant. */
export class ChangeSlugDTO {
    @Field(FIELD_RULES.slug)
    public slug: string;

    @Field(FIELD_RULES.reason)
    public reason: string;
}
