import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ValidateBy } from 'class-validator';

/**
 * Validates a text field with a normalizer from `@elo/core` and stores the
 * normalized value ("11912345678" becomes "(11) 91234-5678"). With
 * `nullable`, an empty text clears the field.
 */
export function Normalized(normalize: (v: string) => string | null, message: string, opts: { nullable?: boolean } = {}) {
  return applyDecorators(
    Transform(({ value }) => {
      if (typeof value !== 'string') return value;
      if (opts.nullable && value.trim() === '') return null;
      return normalize(value) ?? value;
    }),
    ValidateBy({
      name: 'normalized',
      validator: {
        validate: (v: unknown) => (opts.nullable && (v === null || v === undefined)) || (typeof v === 'string' && normalize(v) !== null),
        defaultMessage: () => message,
      },
    }),
  );
}
