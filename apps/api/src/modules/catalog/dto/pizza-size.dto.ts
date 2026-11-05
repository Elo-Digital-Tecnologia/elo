import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsUUID } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';

export class PizzaSizeDTO {
    /** Made by the form, so flavor prices survive a rename. */
    @IsUUID()
    public id: string;

    @Field(FIELD_RULES.optionName)
    public label: string;

    @Field(FIELD_RULES.flavorsPerSize)
    public maxFlavors: number;
}
