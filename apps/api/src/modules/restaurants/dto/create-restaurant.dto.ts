import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsOptional, IsUUID } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class CreateRestaurantDTO {
    @Field(FIELD_RULES.restaurantName)
    public name: string;

    @Field(FIELD_RULES.slug, { optional: true })
    public slug?: string;

    @Field(FIELD_RULES.personName)
    public managerName: string;

    @Field(FIELD_RULES.contact)
    public managerContact: string;

    /** Optional: the plan comes with the contract; this one is only its starting suggestion. */
    @IsOptional()
    @IsUUID()
    public planId?: string;

    @Field(FIELD_RULES.serviceFeeBps, { optional: true })
    public serviceFeeBps?: number;

    @Field(FIELD_RULES.username)
    public adminUsername: string;

    @Field(FIELD_RULES.password)
    public adminPassword: string;
}
