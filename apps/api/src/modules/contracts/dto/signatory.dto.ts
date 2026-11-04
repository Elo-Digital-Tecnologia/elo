import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class SignatoryDTO {
    @Field(FIELD_RULES.personName)
    public name: string;

    @Field(FIELD_RULES.signatoryRole)
    public role: string;

    @Field(FIELD_RULES.contact)
    public contact: string;
}
