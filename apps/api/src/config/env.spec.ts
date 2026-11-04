import { describe, expect, it } from 'vitest';
import { parseDuration } from '#/config/duration.js';
import { loadConfig, productionProblems } from '#/config/env.js';

const base = {
    NODE_ENV: 'development',
    APP_PORT: '3001',
    APP_PREFIX: 'api',
    APP_PUBLIC_URL: 'https://elo.example.com',
    APP_TIME_ZONE: 'America/Sao_Paulo',
    APP_DOCS: 'true',
    APP_UPLOAD_DIR: './uploads',
    APP_CORS_ORIGINS: 'https://elo.example.com',
    APP_CORS_METHODS: 'GET,POST',
    PG_HOST: 'localhost',
    PG_PORT: '5432',
    PG_USER: 'elo',
    PG_PASS: 'elo',
    PG_DBNAME: 'elo',
    PG_SSL: 'false',
    JWT_ACCESS_TOKEN_SECRET: 'j'.repeat(64),
    JWT_ACCESS_TOKEN_EXPIRES_IN: '60min',
    SESSION_REFRESH_EXPIRES_IN: '30d',
    SESSION_TABLE_EXPIRES_IN: '4h',
    SUPERADMIN_KEY: 's'.repeat(64),
    THROTTLE_TTL: '60s',
    THROTTLE_LIMIT: '300',
    RETENTION_RESTAURANT_PURGE_IN: '90d',
    RETENTION_AUDIT_LOG_IN: '180d',
    RETENTION_AUDIT_LOG_CLEANUP_EVERY: '24h'
};

describe('environment', () => {
    it('reads durations', () => {
        expect(parseDuration('60s')).toBe(60_000);
        expect(parseDuration('15min')).toBe(900_000);
        expect(parseDuration('7d')).toBe(604_800_000);
        expect(parseDuration('0d')).toBeNull();
        expect(parseDuration('soon')).toBeNull();
    });

    it('builds the nested config', () => {
        const config = loadConfig(base);
        expect(config.app.port).toBe(3001);
        expect(config.jwt.accessTokenExpiresInMs).toBe(3_600_000);
        expect(config.app.cors).toEqual({
            anyOrigin: false,
            origins: ['https://elo.example.com'],
            methods: ['GET', 'POST']
        });
        expect(loadConfig({ ...base, APP_CORS_ORIGINS: '*' }).app.cors.anyOrigin).toBe(
            true
        );
    });

    it('refuses missing values and invalid durations', () => {
        expect(() => loadConfig({ ...base, JWT_ACCESS_TOKEN_SECRET: '' })).toThrow(
            /JWT_ACCESS_TOKEN_SECRET/
        );
        expect(() =>
            loadConfig({ ...base, SESSION_TABLE_EXPIRES_IN: '4 hours' })
        ).toThrow(/SESSION_TABLE_EXPIRES_IN/);
    });

    it('refuses plain http, open CORS and short secrets in production', () => {
        expect(productionProblems(base)).toEqual([]);
        expect(
            productionProblems({
                ...base,
                APP_PUBLIC_URL: 'http://elo.example.com',
                APP_CORS_ORIGINS: '*',
                JWT_ACCESS_TOKEN_SECRET: 'x'.repeat(20)
            })
        ).toHaveLength(3);
        expect(() =>
            loadConfig({
                ...base,
                NODE_ENV: 'production',
                SUPERADMIN_KEY: 'k'.repeat(24)
            })
        ).toThrow(/SUPERADMIN_KEY/);
    });
});
