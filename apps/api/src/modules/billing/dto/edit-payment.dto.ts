import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsOptional, IsUUID } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { IsDay } from '#/common/decorators/is-day.decorator.js';

export class EditPaymentDTO {
    @Field(FIELD_RULES.paymentCents, { optional: true })
    public amountCents?: number;

    @IsOptional()
    @IsDay()
    public paidAt?: string;

    @Field(FIELD_RULES.paymentNote, { optional: true })
    public note?: string | null;

    /** Attaches a proof to a payment that has none yet. */
    @IsOptional()
    @IsUUID()
    public receiptId?: string;

    @Field(FIELD_RULES.optionalReason, { optional: true })
    public noReceiptReason?: string | null;
}
