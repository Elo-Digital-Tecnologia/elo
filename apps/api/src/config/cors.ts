const PRIVATE_HOST =
    /^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|[a-z0-9-]+\.local)(:\d+)?$/i;

export interface CorsPolicy {
    anyOrigin: boolean;
    origins: string[];
    methods: string[];
    isProduction: boolean;
}

/**
 * `APP_CORS_ORIGINS=*` allows any origin. Origins listed there are always allowed. Outside production any
 * local network origin is allowed too, so the app can be tested from a phone.
 * Requests without an `Origin` header come from servers or the same origin.
 */
export function isAllowedOrigin(origin: string | undefined, policy: CorsPolicy): boolean {
    if (!origin || policy.anyOrigin) return true;
    if (policy.origins.includes(origin)) return true;
    return !policy.isProduction && PRIVATE_HOST.test(origin);
}

export const corsOriginOf =
    (policy: CorsPolicy) =>
    (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
    ) =>
        callback(null, isAllowedOrigin(origin, policy));
