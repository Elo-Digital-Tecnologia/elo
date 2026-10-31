import { applyDecorators, BadRequestException, ValidationPipe } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ValidateBy, ValidateIf, type ValidationError } from 'class-validator';
import { dateOnly, type FieldError, type FieldErrorCode, type FieldRule } from '@elo/core';

const FIELD = 'field';

/**
 * Validates and normalizes a property with a rule from `@elo/core` (the same one
 * the forms use), so "  Ana  " is stored as "Ana" and an invalid value reports one
 * specific code. With `optional`, a missing property (a partial update) is skipped;
 * an explicit null still goes through the rule.
 */
export function Field(rule: FieldRule, opts: { optional?: boolean } = {}) {
  const decorators = [
    Transform(({ value }) => {
      const r = rule.check(value);
      return r.ok ? r.value : value;
    }),
    ValidateBy({
      name: FIELD,
      validator: {
        validate: (v: unknown) => rule.check(v).ok,
        defaultMessage: (args) => {
          const r = rule.check(args?.value);
          return JSON.stringify(r.ok ? { code: 'invalid' } : r.error);
        },
      },
    }),
  ];
  if (opts.optional) decorators.unshift(ValidateIf((_o: unknown, v: unknown) => v !== undefined));
  return applyDecorators(...decorators);
}

/** A real calendar day as YYYY-MM-DD ("2024-02-30" is refused, not just the format). */
export function IsDay() {
  return ValidateBy({
    name: 'isDay',
    validator: { validate: (v: unknown) => typeof v === 'string' && dateOnly(v) !== null, defaultMessage: () => JSON.stringify({ code: 'invalid_date' }) },
  });
}

/** Present-or-absent: undefined skips the checks, but an explicit null is checked (and refused) like any value. */
export const Present = () => ValidateIf((_o: unknown, v: unknown) => v !== undefined);

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
  maxLength: 'too_long',
};

/** Flattens nested errors into `items.0.notes` paths, one code per field. */
export function fieldsOf(errors: ValidationError[], prefix = ''): Record<string, FieldError> {
  const out: Record<string, FieldError> = {};
  for (const e of errors) {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    const constraints = e.constraints ?? {};
    const own = constraints[FIELD] ?? constraints.isDay;
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
 * normalized, and a failure answers `400 { message: 'validation_failed', fields }`
 * so the forms can put each message under its own field.
 */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException({ statusCode: 400, message: 'validation_failed', fields: fieldsOf(errors) }),
  });
}
