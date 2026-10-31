import { IsInt, Max, Min } from 'class-validator';
import { FIELD_RULES } from '@elo/core';
import { Field } from '../common/validation';

export class ReviewDto {
  @IsInt() @Min(1) @Max(5) stars: number;
  @Field(FIELD_RULES.reviewComment, { optional: true }) comment?: string | null;
}
