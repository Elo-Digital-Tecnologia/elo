import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    ValidateNested
} from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { CATALOG_LIMITS } from '../catalog.constants.js';
import { PizzaAddonChoiceDTO } from './pizza-addon-choice.dto.js';

export class PizzaAddonGroupDTO {
    @Field(FIELD_RULES.optionName)
    public name: string;

    @IsBoolean()
    public required: boolean;

    @IsBoolean()
    public multiple: boolean;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(CATALOG_LIMITS.choicesPerOptionGroup)
    @ValidateNested({ each: true })
    @Type(() => PizzaAddonChoiceDTO)
    public choices: PizzaAddonChoiceDTO[];
}
