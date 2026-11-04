import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from '#/config/cors.js';

describe('isAllowedOrigin', () => {
    const dev = {
        anyOrigin: false,
        origins: ['https://app.exemplo.com'],
        methods: ['GET'],
        isProduction: false
    };
    const prod = { ...dev, isProduction: true };

    it('allows listed origins always', () => {
        expect(isAllowedOrigin('https://app.exemplo.com', prod)).toBe(true);
    });
    it('allows LAN origins outside production', () => {
        expect(isAllowedOrigin('http://192.168.0.19:3000', dev)).toBe(true);
        expect(isAllowedOrigin('http://10.1.2.3:3002', dev)).toBe(true);
        expect(isAllowedOrigin('http://localhost:3003', dev)).toBe(true);
    });
    it('allows any origin with the wildcard', () => {
        expect(
            isAllowedOrigin('https://evil.example', { ...prod, anyOrigin: true })
        ).toBe(true);
    });
    it('blocks LAN origins in production and public origins anywhere', () => {
        expect(isAllowedOrigin('http://192.168.0.19:3000', prod)).toBe(false);
        expect(isAllowedOrigin('https://evil.example', dev)).toBe(false);
        expect(isAllowedOrigin('http://192.168.0.19.evil.com', dev)).toBe(false);
    });
});
