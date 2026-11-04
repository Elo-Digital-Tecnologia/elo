import type { FieldError, FieldErrorCode } from '@elo/core/fields/field-rules';
import type { ValidationError } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { ValidationFailedException } from '#/common/exceptions/validation-failed.exception.js';

const FIELD = 'field';

/** Codes for the plain class-validator checks still used next to `@Field`. */
const CONSTRAINT_CODES: Record<string, FieldErrorCode> = {
    whitelistValidation: 'unknown_field',
    isDefined: 'required',
    isNotEmpty: 'required',
    isIn: 'invalid_option',
    isEnum: 'invalid_option',
    isUuid: 'invalid',
    isInt: 'not_integer',
    isNumber: 'not_integer',
    min: 'too_small',
    max: 'too_large',
    isBoolean: 'invalid_type',
    isString: 'invalid_type',
    isArray: 'invalid_type',
    isObject: 'invalid_type',
    arrayMinSize: 'too_few',
    arrayMaxSize: 'too_many',
    arrayUnique: 'invalid',
    isIso8601: 'invalid_date',
    isDateString: 'invalid_date',
    matches: 'invalid',
    minLength: 'too_short',
    maxLength: 'too_long'
};

/** Flattens nested errors into `items.0.notes` paths, one code per field. */
export function fieldsOf(
    errors: ValidationError[],
    prefix = ''
): Record<string, FieldError> {
    const out: Record<string, FieldError> = {};
    for (const e of errors) {
        const path = prefix ? `${prefix}.${e.property}` : e.property;
        const constraints = e.constraints ?? {};
        const own = constraints[FIELD] ?? constraints['isDay'];
        if (own) {
            try {
                out[path] = JSON.parse(own) as FieldError;
            } catch {
                out[path] = { code: 'invalid' };
            }
        } else {
            const first = Object.keys(constraints)[0];
            if (first) out[path] = { code: CONSTRAINT_CODES[first] ?? 'invalid' };
        }
        if (e.children?.length) Object.assign(out, fieldsOf(e.children, path));
    }
    return out;
}

/**
 * The API's validation: unknown properties are refused, values are converted and
 * normalized, and a failure lists one code per field so the forms can put each
 * message under its own field.
 */
export class ApiValidationPipe extends ValidationPipe {
    constructor() {
        super({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            exceptionFactory: (errors) =>
                new ValidationFailedException(
                    Object.entries(fieldsOf(errors)).map(([field, error]) => ({
                        field,
                        ...error
                    }))
                )
        });
    }
}
