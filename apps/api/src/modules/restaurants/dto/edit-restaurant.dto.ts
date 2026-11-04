import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Field } from '#/common/decorators/field.decorator.js';

export class EditRestaurantDTO {
    @Field(FIELD_RULES.restaurantName, { optional: true })
    public name?: string;

    @Field(FIELD_RULES.personName, { optional: true })
    public managerName?: string;

    @Field(FIELD_RULES.contact, { optional: true })
    public managerContact?: string;
}
