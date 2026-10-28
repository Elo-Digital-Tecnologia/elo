import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
  @IsOptional() @Matches(/^(https?:\/\/\S+|\/api\/media\/[0-9a-f-]{36}\.webp)$/) @MaxLength(500) imageUrl?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => OptionGroupDto)
  options?: OptionGroupDto[];
}

export class AvailabilityDto {
  @IsBoolean() available: boolean;
}
