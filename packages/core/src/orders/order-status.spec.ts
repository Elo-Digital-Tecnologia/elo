import { describe, expect, it } from 'vitest';
import { Role, rolesOf } from '../roles/roles.js';
import { previousOrderStatus } from './order-status.js';

describe('order status steps', () => {
    it('goes back one step and never past sent or out of a closed status', () => {
        expect(previousOrderStatus('ready')).toBe('preparing');
        expect(previousOrderStatus('received')).toBe('sent');
        expect(previousOrderStatus('sent')).toBeNull();
        expect(previousOrderStatus('cancelled')).toBeNull();
    });
    it('rolesOf reads tokens issued with a single role', () => {
        expect(rolesOf({ role: Role.WAITER })).toEqual([Role.WAITER]);
        expect(rolesOf({ roles: [Role.KITCHEN, Role.CASHIER] })).toEqual([
            Role.KITCHEN,
            Role.CASHIER
        ]);
    });
});
