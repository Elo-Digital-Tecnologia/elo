import { Type } from 'class-transformer';
import { FIELD_RULES, PRODUCT_TAGS, type ProductTag } from '@elo/core';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Field } from '../common/validation';

export class CategoryDto {
  @Field(FIELD_RULES.categoryName) name: string;
  @Field(FIELD_RULES.position, { optional: true }) position?: number;
}

export class OptionChoiceDto {
  @Field(FIELD_RULES.optionName) label: string;
  @Field(FIELD_RULES.priceCents) priceCents: number;
}

export class OptionGroupDto {
  @Field(FIELD_RULES.optionName) name: string;
  @IsBoolean() required: boolean;
  @IsBoolean() multiple: boolean;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => OptionChoiceDto)
  choices: OptionChoiceDto[];
}

export class ProductDto {
  @IsUUID() categoryId: string;
  @Field(FIELD_RULES.productName) name: string;
  @Field(FIELD_RULES.productDescription, { optional: true }) description?: string | null;
  @Field(FIELD_RULES.priceCents) priceCents: number;
  /** Link externo (https) ou imagem do banco do restaurante (/api/media/<id>.webp). */
  @Field(FIELD_RULES.imageUrl, { optional: true }) imageUrl?: string | null;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(PRODUCT_TAGS.length) @ArrayUnique() @IsIn(PRODUCT_TAGS, { each: true }) tags?: ProductTag[];
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => OptionGroupDto)
  options?: OptionGroupDto[];
}

export class AvailabilityDto {
  @IsBoolean() available: boolean;
}

/** Nova ordem de itens: lista completa de ids, na ordem desejada. */
export class OrderIdsDto {
  @IsArray() @ArrayMaxSize(500) @ArrayUnique() @IsUUID('all', { each: true }) ids: string[];
}

export class ProductOrderDto extends OrderIdsDto {
  @IsUUID() categoryId: string;
}
