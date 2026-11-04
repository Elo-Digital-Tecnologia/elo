/** Random bytes of a table token (before base64url): long enough that links cannot be guessed. */
export const TABLE_TOKEN_BYTES = 24;
/** Lengths a table token may have in a link. */
export const TABLE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
/**
 * New guest sessions one table accepts within the window, whatever the address they come from.
 * Generous for a group scanning together; stops a leaked link from opening sessions nonstop.
 */
export const TABLE_SESSION_START_LIMIT = { max: 20, windowMs: 10 * 60_000 } as const;
export const QR_CODE = { width: 512, margin: 2 } as const;
