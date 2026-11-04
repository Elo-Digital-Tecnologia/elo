import { BPS_PER_PERCENT, CENTS_PER_REAL } from '@elo/core/money/cents';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

/** Cents as typed in a money field: 3990 → "39,90". */
export const centsToInput = (cents: number) =>
    (cents / CENTS_PER_REAL).toFixed(2).replace('.', ',');

export const centsToReais = (cents: number) => cents / CENTS_PER_REAL;
export const reaisToCents = (reais: number) => Math.round(reais * CENTS_PER_REAL);

/** Basis points as a percent: 1000 → 10. */
export const bpsToPercent = (bps: number) => bps / BPS_PER_PERCENT;
export const percentToBps = (percent: number) => Math.round(percent * BPS_PER_PERCENT);

/** "820 KB", "2,4 MB". */
export const fileSize = (bytes: number) =>
    bytes < BYTES_PER_MB
        ? `${Math.max(1, Math.round(bytes / BYTES_PER_KB))} KB`
        : `${(bytes / BYTES_PER_MB).toFixed(1).replace('.', ',')} MB`;
