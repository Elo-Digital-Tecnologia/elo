import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { BILLING_LIMITS, FIELD_RULES } from '@elo/core';
import { Field, IsDay, Present } from '../common/validation';

export class PlanDto {
  @Field(FIELD_RULES.planName) name: string;
  @Field(FIELD_RULES.planPriceCents) priceCents: number;
  @IsInt() @Min(1) @Max(BILLING_LIMITS.cycleMonthsMax) cycleMonths: number;
  @Present() @IsBoolean() active?: boolean;
}

export class UpdatePlanDto {
  @Field(FIELD_RULES.planName, { optional: true }) name?: string;
  @Field(FIELD_RULES.planPriceCents, { optional: true }) priceCents?: number;
  @Present() @IsInt() @Min(1) @Max(BILLING_LIMITS.cycleMonthsMax) cycleMonths?: number;
  @Present() @IsBoolean() active?: boolean;
}

/** `paidAt` is a calendar day (YYYY-MM-DD); the period is calculated by the server. */
export class RecordPaymentDto {
  @IsInt() @Min(1) @Max(BILLING_LIMITS.cyclesMax) cycles: number;
  @IsDay() paidAt: string;
  @Field(FIELD_RULES.paymentCents, { optional: true }) amountCents?: number;
  @Field(FIELD_RULES.paymentNote, { optional: true }) note?: string | null;
}

export class PaymentPreviewQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(BILLING_LIMITS.cyclesMax) cycles: number;
  @IsDay() paidAt: string;
}

export class EditPaymentDto {
  @Field(FIELD_RULES.paymentCents, { optional: true }) amountCents?: number;
  @IsOptional() @IsDay() paidAt?: string;
  @Field(FIELD_RULES.paymentNote, { optional: true }) note?: string | null;
}

export class VoidEntryDto {
  @Field(FIELD_RULES.reason) reason: string;
}

export class AdjustDueDateDto {
  @IsDay() dueDate: string;
  @Field(FIELD_RULES.reason) reason: string;
}

export class ChangePlanDto {
  @IsUUID() planId: string;
}
