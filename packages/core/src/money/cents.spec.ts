import { describe, expect, it } from 'vitest';
import { parseCents } from './cents.js';

describe('parseCents', () => {
    it('parses comma and dot', () => {
        expect(parseCents('12,50')).toBe(1250);
        expect(parseCents('12.5')).toBe(1250);
        expect(parseCents('7')).toBe(700);
    });
    it('rejects garbage', () => {
        expect(parseCents('abc')).toBeNull();
        expect(parseCents('-1')).toBeNull();
    });
});
