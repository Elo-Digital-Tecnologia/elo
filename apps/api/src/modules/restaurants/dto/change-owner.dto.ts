import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsUUID } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class ChangeOwnerDTO {
    @IsUUID()
    public userId: string;

    @Field(FIELD_RULES.reason)
    public reason: string;
}
