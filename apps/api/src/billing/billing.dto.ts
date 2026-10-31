import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BILLING_LIMITS } from '@elo/core';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class PlanDto {
  @trim() @IsString() @MinLength(2) @MaxLength(BILLING_LIMITS.planNameMax) name: string;
  @IsInt() @Min(1) @Max(BILLING_LIMITS.planPriceMaxCents) priceCents: number;
  @IsInt() @Min(1) @Max(BILLING_LIMITS.cycleMonthsMax) cycleMonths: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdatePlanDto {
  @IsOptional() @trim() @IsString() @MinLength(2) @MaxLength(BILLING_LIMITS.planNameMax) name?: string;
  @IsOptional() @IsInt() @Min(1) @Max(BILLING_LIMITS.planPriceMaxCents) priceCents?: number;
  @IsOptional() @IsInt() @Min(1) @Max(BILLING_LIMITS.cycleMonthsMax) cycleMonths?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

/** `paidAt` is a calendar day (YYYY-MM-DD); the period is calculated by the server. */
export class RecordPaymentDto {
  @IsInt() @Min(1) @Max(BILLING_LIMITS.cyclesMax) cycles: number;
  @Matches(DAY) paidAt: string;
  @IsOptional() @IsInt() @Min(1) amountCents?: number;
  @IsOptional() @IsString() @MaxLength(BILLING_LIMITS.noteMax) note?: string;
}

export class PaymentPreviewQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(BILLING_LIMITS.cyclesMax) cycles: number;
  @Matches(DAY) paidAt: string;
}

export class EditPaymentDto {
  @IsOptional() @IsInt() @Min(1) amountCents?: number;
  @IsOptional() @Matches(DAY) paidAt?: string;
  @IsOptional() @IsString() @MaxLength(BILLING_LIMITS.noteMax) note?: string | null;
}

export class VoidEntryDto {
  @trim() @IsString() @MinLength(BILLING_LIMITS.reasonMin) @MaxLength(BILLING_LIMITS.reasonMax) reason: string;
}

export class AdjustDueDateDto {
  @Matches(DAY) dueDate: string;
  @trim() @IsString() @MinLength(BILLING_LIMITS.reasonMin) @MaxLength(BILLING_LIMITS.reasonMax) reason: string;
}

export class ChangePlanDto {
  @IsUUID() planId: string;
}
