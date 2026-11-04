/** Random bytes of a table token (before base64url): long enough that links cannot be guessed. */
export const TABLE_TOKEN_BYTES = 24;
/** Lengths a table token may have in a link. */
export const TABLE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
export const QR_CODE = { width: 512, margin: 2 } as const;
