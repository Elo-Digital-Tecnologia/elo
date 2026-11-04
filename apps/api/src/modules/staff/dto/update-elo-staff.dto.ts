import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { ALL_PERMISSIONS } from '@elo/core/roles/permissions';
import { ArrayUnique, IsArray, IsIn, IsOptional } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class UpdateEloStaffDTO {
    @Field(FIELD_RULES.personName, { optional: true })
    public name?: string;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsIn(ALL_PERMISSIONS, { each: true })
    public permissions?: string[];
}
