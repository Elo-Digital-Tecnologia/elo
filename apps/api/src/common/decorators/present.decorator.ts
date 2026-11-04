import { ValidateIf } from 'class-validator';

/** Present-or-absent: undefined skips the checks, but an explicit null is checked (and refused) like any value. */
export const Present = () => ValidateIf((_o: unknown, v: unknown) => v !== undefined);
