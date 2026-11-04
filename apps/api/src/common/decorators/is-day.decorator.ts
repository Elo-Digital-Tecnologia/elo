import { dateOnly } from '@elo/core/billing/billing';
import { ValidateBy } from 'class-validator';

/** A real calendar day as YYYY-MM-DD ("2024-02-30" is refused, not just the format). */
export function IsDay() {
    return ValidateBy({
        name: 'isDay',
        validator: {
            validate: (v: unknown) => typeof v === 'string' && dateOnly(v) !== null,
            defaultMessage: () => JSON.stringify({ code: 'invalid_date' })
        }
    });
}
