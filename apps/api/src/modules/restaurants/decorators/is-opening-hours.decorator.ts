import type { ValidationOptions } from 'class-validator';
import { hoursProblems } from '@elo/core/opening-hours/open-status';
import { registerDecorator } from 'class-validator';

/** Seven days (Sunday to Saturday), each a list of shifts `{ open, close }` as "HH:MM"; the rules live in `hoursProblems`. */
export function IsOpeningHours(options?: ValidationOptions) {
    return (target: object, property: string) =>
        registerDecorator({
            name: 'isOpeningHours',
            target: target.constructor,
            propertyName: property,
            ...(options && { options }),
            validator: {
                validate: (value: unknown) => hoursProblems(value).length === 0,
                defaultMessage: (args) => {
                    const [first] = hoursProblems(args?.value);
                    const day = first?.day != null ? ` on day ${first.day}` : '';
                    return `openingHours is invalid: ${first?.code ?? 'unknown'}${day}`;
                }
            }
        });
}
