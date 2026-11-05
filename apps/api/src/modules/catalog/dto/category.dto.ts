import type { CategoryKind } from '@elo/core/catalog/category-kinds';
import { CATEGORY_KINDS } from '@elo/core/catalog/category-kinds';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { PizzaSetupDTO } from './pizza-setup.dto.js';

export class CategoryDTO {
    @Field(FIELD_RULES.categoryName)
    public name: string;

    @Field(FIELD_RULES.position, { optional: true })
    public position?: number;

    /** Taken on creation only; a category keeps its kind. */
    @IsOptional()
    @IsIn(CATEGORY_KINDS)
    public kind?: CategoryKind;

    /** Required by pizza categories, refused by the others. */
    @IsOptional()
    @ValidateNested()
    @Type(() => PizzaSetupDTO)
    public pizza?: PizzaSetupDTO;
}
