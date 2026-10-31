import { IsBoolean } from 'class-validator';
import { FIELD_RULES } from '@elo/core';
import { Field } from '../common/validation';

export class AdjustmentDto {
  @Field(FIELD_RULES.adjustmentLabel) label: string;
  /** Positivo acrescenta, negativo dá desconto (centavos). */
  @Field(FIELD_RULES.adjustmentCents) cents: number;
  @Field(FIELD_RULES.adjustmentReason, { optional: true }) reason?: string | null;
}

export class WaiveFeeDto {
  @IsBoolean() waived: boolean;
}

export class RefuseFeeDto {
  @IsBoolean() refuse: boolean;
}
