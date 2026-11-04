import { MS_PER_MINUTE, MS_PER_SECOND } from '@elo/core/time/time-units';

export const TABLE_SESSION_COOKIE_NAME = 'elo_table';

/** Account name of the superadmin, who signs in with the environment key. */
export const SUPERADMIN_NAME = 'Superadmin';

/** Shape of the uuids the database generates; used to tell staff ids from other actors. */
export const UUID_PATTERN = /^[0-9a-f-]{36}$/;

/** Per-route rate limits, on top of the global one from the environment. */
export const RATE_LIMITS = {
    SIGN_IN: { default: { limit: 10, ttl: MS_PER_MINUTE } },
    PASSWORD_CHANGE: { default: { limit: 10, ttl: MS_PER_MINUTE } },
    SESSION_RENEWAL: { default: { limit: 120, ttl: MS_PER_MINUTE } },
    DOCUMENT_UPLOAD: { default: { limit: 20, ttl: MS_PER_MINUTE } },
    GUEST: { default: { limit: 60, ttl: MS_PER_MINUTE } },
    TABLE_SESSION_START: { default: { limit: 20, ttl: MS_PER_MINUTE } }
} as const;

/** Length of a day in ISO format, "YYYY-MM-DD". */
export const ISO_DAY_LENGTH = 10;

/** Longest file name kept for uploaded images and documents. */
export const FILE_NAME_MAX_LENGTH = 120;

/** Path of an image from the restaurants' image library, with its id. */
export const MEDIA_URL_PATTERN = /^\/api\/media\/([0-9a-f-]{36})\.webp$/;

/** How long a read of a frequently checked row (session, access, closures) is reused. */
export const SHORT_CACHE_MS = 10 * MS_PER_SECOND;
