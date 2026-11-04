import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { ALL_PERMISSIONS } from '@elo/core/roles/permissions';
import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class CreateEloStaffDTO {
    @Field(FIELD_RULES.username)
    public username: string;

    @Field(FIELD_RULES.personName)
    public name: string;

    @Field(FIELD_RULES.password)
    public password: string;

    @IsArray()
    @ArrayUnique()
    @IsIn(ALL_PERMISSIONS, { each: true })
    public permissions: string[];
}
