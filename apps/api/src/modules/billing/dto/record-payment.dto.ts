import { BILLING_LIMITS } from '@elo/core/billing/billing';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { IsDay } from '#/common/decorators/is-day.decorator.js';

/** `paidAt` is a calendar day (YYYY-MM-DD); the period is calculated by the server. */
export class RecordPaymentDTO {
    @IsInt()
    @Min(1)
    @Max(BILLING_LIMITS.cyclesMax)
    public cycles: number;

    @IsDay()
    public paidAt: string;

    @Field(FIELD_RULES.paymentCents, { optional: true })
    public amountCents?: number;

    @Field(FIELD_RULES.paymentNote, { optional: true })
    public note?: string | null;

    /** A proof uploaded first to /admin/restaurants/:id/documents, or the reason there is none. */
    @IsOptional()
    @IsUUID()
    public receiptId?: string;

    @Field(FIELD_RULES.optionalReason, { optional: true })
    public noReceiptReason?: string | null;
}
