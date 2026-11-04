import { MS_PER_SECOND } from '@elo/core/time/time-units';

/** Endpoints and keys a browser hands over for Web Push. */
export const PUSH_ENDPOINT_MAX_LENGTH = 1000;
export const PUSH_P256DH_MAX_LENGTH = 120;
export const PUSH_AUTH_MAX_LENGTH = 60;
/** A notice older than this is useless (an order ready, a call answered). */
export const PUSH_TTL_SECONDS = 120;
export const PUSH_REQUEST_TIMEOUT_MS = 10 * MS_PER_SECOND;
/** Lifetime of the VAPID token sent to push services (they accept up to 24 h). */
export const VAPID_TOKEN_SECONDS = 12 * 60 * 60;
