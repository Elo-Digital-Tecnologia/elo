import { BILLING_LIMITS } from '@elo/core/billing/billing';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { IsDay } from '#/common/decorators/is-day.decorator.js';

export class PaymentPreviewQueryDTO {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(BILLING_LIMITS.cyclesMax)
    public cycles: number;

    @IsDay()
    public paidAt: string;
}
