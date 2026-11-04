import { BILLING_LIMITS } from '@elo/core/billing/billing';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { Present } from '#/common/decorators/present.decorator.js';

export class PlanDTO {
    @Field(FIELD_RULES.planName)
    public name: string;

    @Field(FIELD_RULES.planPriceCents)
    public priceCents: number;

    @IsInt()
    @Min(1)
    @Max(BILLING_LIMITS.cycleMonthsMax)
    public cycleMonths: number;

    @Present()
    @IsBoolean()
    public active?: boolean;
}
