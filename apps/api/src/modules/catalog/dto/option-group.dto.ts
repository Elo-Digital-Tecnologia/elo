import type { FlavorPricing, OptionGroupKind } from '@elo/core/catalog/option-kinds';
import { FLAVOR_PRICINGS, OPTION_GROUP_KINDS } from '@elo/core/catalog/option-kinds';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsIn,
    IsOptional,
    ValidateNested
} from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { CATALOG_LIMITS } from '../catalog.constants.js';
import { OptionChoiceDTO } from './option-choice.dto.js';

export class OptionGroupDTO {
    @Field(FIELD_RULES.optionName)
    public name: string;

    /** Absent means an extra, as before kinds existed. */
    @IsOptional()
    @IsIn(OPTION_GROUP_KINDS)
    public kind?: OptionGroupKind;

    @IsBoolean()
    public required: boolean;

    @IsBoolean()
    public multiple: boolean;

    @IsOptional()
    @IsIn(FLAVOR_PRICINGS)
    public flavorPricing?: FlavorPricing;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(CATALOG_LIMITS.choicesPerOptionGroup)
    @ValidateNested({ each: true })
    @Type(() => OptionChoiceDTO)
    public choices: OptionChoiceDTO[];
}
