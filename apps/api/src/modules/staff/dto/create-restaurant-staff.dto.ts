import type { Role } from '@elo/core/roles/roles';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { RestaurantStaffRoles } from '@elo/core/roles/roles';
import { ArrayMinSize, ArrayUnique, IsArray, IsIn } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class CreateRestaurantStaffDTO {
    @Field(FIELD_RULES.username)
    public username: string;

    @Field(FIELD_RULES.password)
    public password: string;

    @Field(FIELD_RULES.personName)
    public name: string;

    @Field(FIELD_RULES.displayName, { optional: true })
    public displayName?: string | null;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsIn(RestaurantStaffRoles, { each: true })
    public roles: Role[];
}
