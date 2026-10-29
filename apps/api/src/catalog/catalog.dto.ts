import { Type } from 'class-transformer';
import { PRODUCT_TAGS, type ProductTag } from '@elo/core';
import { IMAGE_URL_PATTERN } from '../common/image-url';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CategoryDto {
  @IsString() @MinLength(1) @MaxLength(80) name: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class OptionChoiceDto {
  @IsString() @MinLength(1) @MaxLength(80) label: string;
  @IsInt() @Min(0) priceCents: number;
}

export class OptionGroupDto {
  @IsString() @MinLength(1) @MaxLength(80) name: string;
  @IsBoolean() required: boolean;
  @IsBoolean() multiple: boolean;
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => OptionChoiceDto)
  choices: OptionChoiceDto[];
}

export class ProductDto {
  @IsUUID() categoryId: string;
  @IsString() @MinLength(1) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsInt() @Min(0) priceCents: number;
  /** Link externo ou imagem do banco do restaurante (/api/media/<id>.webp). */
  @IsOptional() @Matches(IMAGE_URL_PATTERN) @MaxLength(500) imageUrl?: string;
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
