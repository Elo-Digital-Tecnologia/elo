import type { FlavorPricing } from '@elo/core/catalog/option-kinds';
import { FLAVOR_PRICINGS } from '@elo/core/catalog/option-kinds';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, ValidateNested } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { CATALOG_LIMITS } from '../catalog.constants.js';
import { PizzaAddonGroupDTO } from './pizza-addon-group.dto.js';
import { PizzaSizeDTO } from './pizza-size.dto.js';

export class PizzaSetupDTO {
    @Field(FIELD_RULES.optionName)
    public sizesName: string;

    @Field(FIELD_RULES.optionName)
    public flavorsName: string;

    @IsArray()
    @ArrayMaxSize(CATALOG_LIMITS.pizzaSizes)
    @ValidateNested({ each: true })
    @Type(() => PizzaSizeDTO)
    public sizes: PizzaSizeDTO[];

    @IsIn(FLAVOR_PRICINGS)
    public flavorPricing: FlavorPricing;

    @IsArray()
    @ArrayMaxSize(CATALOG_LIMITS.optionGroupsPerProduct)
    @ValidateNested({ each: true })
    @Type(() => PizzaAddonGroupDTO)
    public addons: PizzaAddonGroupDTO[];
}
