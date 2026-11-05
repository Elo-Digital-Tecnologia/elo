import type { ProductTag } from '@elo/core/catalog/product-tags';
import { PRODUCT_TAGS } from '@elo/core/catalog/product-tags';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsIn,
    IsObject,
    IsOptional,
    IsUUID,
    ValidateNested
} from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { CATALOG_LIMITS } from '../catalog.constants.js';
import { OptionGroupDTO } from './option-group.dto.js';

export class ProductDTO {
    @IsUUID()
    public categoryId: string;

    @Field(FIELD_RULES.productName)
    public name: string;

    @Field(FIELD_RULES.productDescription, { optional: true })
    public description?: string | null;

    /** Required unless a size group sets the price. */
    @Field(FIELD_RULES.priceCents, { optional: true })
    public priceCents?: number;

    /** External link (https) or an image from the restaurant's library (/api/media/<id>.webp). */
    @Field(FIELD_RULES.imageUrl, { optional: true })
    public imageUrl?: string | null;

    @IsOptional()
    @IsBoolean()
    public featured?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(PRODUCT_TAGS.length)
    @ArrayUnique()
    @IsIn(PRODUCT_TAGS, { each: true })
    public tags?: ProductTag[];

    @IsOptional()
    @IsBoolean()
    public available?: boolean;

    /** Pizza flavor: price by size id of its category. Checked against the category by the service. */
    @IsOptional()
    @IsObject()
    public sizePrices?: Record<string, number>;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(CATALOG_LIMITS.optionGroupsPerProduct)
    @ValidateNested({ each: true })
    @Type(() => OptionGroupDTO)
    public options?: OptionGroupDTO[];
}
