import type { FieldRule } from '@elo/core/fields/field-rules';
import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ValidateBy, ValidateIf } from 'class-validator';

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
                }
            }
        })
    ];
    if (opts.optional)
        decorators.unshift(ValidateIf((_o: unknown, v: unknown) => v !== undefined));
    return applyDecorators(...decorators);
}
