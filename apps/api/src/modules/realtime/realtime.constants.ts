import { MS_PER_SECOND } from '@elo/core/time/time-units';

export const SOCKET_PING_INTERVAL_MS = 25 * MS_PER_SECOND;
/** Phones freeze pages for a while when locked; a long timeout keeps short freezes from dropping the socket. */
export const SOCKET_PING_TIMEOUT_MS = 60 * MS_PER_SECOND;
