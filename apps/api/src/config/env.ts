import { z } from 'zod';
import { parseDuration } from './duration.js';
import path from 'node:path';

const PRODUCTION_SECRET_LENGTH = 32;
const DEV_SECRET_LENGTH = 16;
const SUPERADMIN_KEY_LENGTH = 24;
const ANY_ORIGIN = '*';
/** bcrypt work factors accepted for staff passwords; production keeps at least the default. */
const PASSWORD_HASH_COST = { min: 4, max: 15, default: 10 } as const;

const isHttps = (url: string) => /^https:\/\/[^\s/]+/.test(url);
const list = (value: string) =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const text = z.string().trim().min(1);
const optionalText = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().optional()
);
const flag = z.enum(['true', 'false']).transform((value) => value === 'true');
const positiveInteger = z.coerce.number().int().positive();
const duration = z.string().transform((value, ctx) => {
    const ms = parseDuration(value);
    if (ms === null) {
        ctx.addIssue({
            code: 'custom',
            message: 'must be a duration such as 60s, 15min, 4h or 7d'
        });
        return z.NEVER;
    }
    return ms;
});

const envSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'test', 'production']),

        // Application
        APP_PORT: positiveInteger,
        APP_PREFIX: z
            .string()
            .trim()
            .regex(/^[a-z0-9-]*$/),
        APP_PUBLIC_URL: z.url(),
        APP_TIME_ZONE: text,
        APP_DOCS: flag,
        APP_UPLOAD_DIR: text,
        APP_CORS_ORIGINS: text,
        APP_CORS_METHODS: text,
        APP_PASSWORD_HASH_COST: z.coerce
            .number()
            .int()
            .min(PASSWORD_HASH_COST.min)
            .max(PASSWORD_HASH_COST.max)
            .default(PASSWORD_HASH_COST.default),

        // Postgres connection
        PG_HOST: text,
        PG_PORT: positiveInteger,
        PG_USER: text,
        PG_PASS: text,
        PG_DBNAME: text,
        PG_SSL: flag,

        // JWT
        JWT_ACCESS_TOKEN_SECRET: z.string().min(DEV_SECRET_LENGTH),
        JWT_ACCESS_TOKEN_EXPIRES_IN: duration,

        // Sessions
        SESSION_REFRESH_EXPIRES_IN: duration,
        SESSION_TABLE_EXPIRES_IN: duration,

        // Superadmin
        SUPERADMIN_KEY: z.string().min(SUPERADMIN_KEY_LENGTH),

        // Rate limit
        THROTTLE_TTL: duration,
        THROTTLE_LIMIT: positiveInteger,

        // Data retention
        RETENTION_RESTAURANT_PURGE_IN: duration,
        RETENTION_AUDIT_LOG_IN: duration,
        RETENTION_AUDIT_LOG_CLEANUP_EVERY: duration,

        // Web Push
        PUSH_VAPID_PUBLIC_KEY: optionalText,
        PUSH_VAPID_PRIVATE_KEY: optionalText,
        PUSH_VAPID_SUBJECT: optionalText
    })
    .superRefine((env, ctx) => {
        if (env.NODE_ENV !== 'production') return;
        for (const problem of productionProblems(env))
            ctx.addIssue({ code: 'custom', message: problem });
    });

export type RawEnv = z.input<typeof envSchema>;

/** What a production deployment must not run with: plain http addresses, open CORS or short secrets. */
export function productionProblems(env: {
    APP_PUBLIC_URL?: string | undefined;
    APP_CORS_ORIGINS?: string | undefined;
    JWT_ACCESS_TOKEN_SECRET?: string | undefined;
    SUPERADMIN_KEY?: string | undefined;
    APP_PASSWORD_HASH_COST?: number | undefined;
}): string[] {
    const problems: string[] = [];
    if (!env.APP_PUBLIC_URL || !isHttps(env.APP_PUBLIC_URL))
        problems.push('APP_PUBLIC_URL must be an https address');
    const origins = list(env.APP_CORS_ORIGINS ?? '');
    if (!origins.length || !origins.every(isHttps))
        problems.push('APP_CORS_ORIGINS must list https addresses only');
    for (const key of ['JWT_ACCESS_TOKEN_SECRET', 'SUPERADMIN_KEY'] as const) {
        if ((env[key] ?? '').length < PRODUCTION_SECRET_LENGTH)
            problems.push(`${key} must be at least ${PRODUCTION_SECRET_LENGTH} chars`);
    }
    if (
        (env.APP_PASSWORD_HASH_COST ?? PASSWORD_HASH_COST.default) <
        PASSWORD_HASH_COST.default
    )
        problems.push(
            `APP_PASSWORD_HASH_COST must be at least ${PASSWORD_HASH_COST.default}`
        );
    return problems;
}

/**
 * Validates the environment and turns it into the nested config read through
 * `ConfigService<EnvConfig>`. Fails at startup when a value is missing or invalid.
 */
export function loadConfig(raw: Record<string, string | undefined> = process.env) {
    const result = envSchema.safeParse(raw);
    if (!result.success) {
        const problems = result.error.issues.map((issue) =>
            issue.path.length
                ? `${issue.path.join('.')}: ${issue.message}`
                : issue.message
        );
        throw new Error(`Invalid environment: ${problems.join('; ')}`);
    }
    const env = result.data;
    const isProduction = env.NODE_ENV === 'production';
    const origins = list(env.APP_CORS_ORIGINS);
    return {
        app: {
            nodeEnv: env.NODE_ENV,
            isProduction,
            port: env.APP_PORT,
            prefix: env.APP_PREFIX,
            publicUrl: env.APP_PUBLIC_URL.replace(/\/$/, ''),
            timeZone: env.APP_TIME_ZONE,
            docs: env.APP_DOCS,
            uploadDir: path.resolve(process.cwd(), env.APP_UPLOAD_DIR),
            cors: {
                anyOrigin: origins.includes(ANY_ORIGIN),
                origins: origins.filter((origin) => origin !== ANY_ORIGIN),
                methods: list(env.APP_CORS_METHODS)
            },
            passwordHashCost: env.APP_PASSWORD_HASH_COST
        },
        database: {
            host: env.PG_HOST,
            port: env.PG_PORT,
            username: env.PG_USER,
            password: env.PG_PASS,
            database: env.PG_DBNAME,
            ssl: env.PG_SSL
        },
        jwt: {
            accessTokenSecret: env.JWT_ACCESS_TOKEN_SECRET,
            accessTokenExpiresInMs: env.JWT_ACCESS_TOKEN_EXPIRES_IN
        },
        session: {
            refreshExpiresInMs: env.SESSION_REFRESH_EXPIRES_IN,
            tableExpiresInMs: env.SESSION_TABLE_EXPIRES_IN
        },
        auth: {
            superadminKey: env.SUPERADMIN_KEY
        },
        throttle: {
            ttlMs: env.THROTTLE_TTL,
            limit: env.THROTTLE_LIMIT
        },
        retention: {
            restaurantPurgeMs: env.RETENTION_RESTAURANT_PURGE_IN,
            auditLogMs: env.RETENTION_AUDIT_LOG_IN,
            auditLogCleanupEveryMs: env.RETENTION_AUDIT_LOG_CLEANUP_EVERY
        },
        push: {
            vapidPublicKey: env.PUSH_VAPID_PUBLIC_KEY ?? null,
            vapidPrivateKey: env.PUSH_VAPID_PRIVATE_KEY ?? null,
            vapidSubject: env.PUSH_VAPID_SUBJECT ?? env.APP_PUBLIC_URL
        }
    };
}

export type EnvConfig = ReturnType<typeof loadConfig>;
