import { describe, expect, it } from 'vitest';
import { canTransitionTable, canWaiterClose } from './table-transitions.js';

describe('table state', () => {
    it('requires validation before open', () => {
        expect(canTransitionTable('closed', 'open')).toBe(false);
        expect(canTransitionTable('pending_open', 'open')).toBe(true);
    });
    it('waiter closes from open or pending_close only', () => {
        expect(canWaiterClose('open')).toBe(true);
        expect(canWaiterClose('pending_open')).toBe(false);
    });
});
