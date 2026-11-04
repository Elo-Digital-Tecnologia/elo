import { describe, expect, it } from 'vitest';
import { Role } from '../roles/roles.js';
import { cancellationRule, returnRule } from './cancellation-rules.js';

describe('cancellationRule', () => {
    it('customer only before preparing', () => {
        expect(cancellationRule({ kind: 'customer' }, 'received')).toMatchObject({
            allowed: true
        });
        expect(cancellationRule({ kind: 'customer' }, 'preparing')).toMatchObject({
            allowed: false
        });
    });
    it('waiter: own table, reason required, notifies kitchen when preparing', () => {
        const w = { kind: 'staff', roles: [Role.WAITER], managesTable: true } as const;
        expect(cancellationRule(w, 'preparing')).toEqual({
            allowed: true,
            reasonRequired: true,
            notifyKitchen: true
        });
        expect(cancellationRule(w, 'ready')).toMatchObject({ allowed: false });
        expect(cancellationRule({ ...w, managesTable: false }, 'sent')).toMatchObject({
            allowed: false
        });
    });
    it('admin cancels up to preparing; after ready only a return is possible', () => {
        const a = { kind: 'staff', roles: [Role.RESTAURANT_ADMIN] } as const;
        expect(cancellationRule(a, 'preparing')).toMatchObject({
            allowed: true,
            reasonRequired: true
        });
        expect(cancellationRule(a, 'ready')).toEqual({
            allowed: false,
            why: 'use_return'
        });
        expect(cancellationRule(a, 'cancelled')).toMatchObject({ allowed: false });
        expect(cancellationRule(a, 'returned')).toMatchObject({ allowed: false });
    });
    it('kitchen/cashier cannot cancel', () => {
        expect(
            cancellationRule({ kind: 'staff', roles: [Role.KITCHEN] }, 'sent')
        ).toMatchObject({
            allowed: false
        });
    });
});

describe('returnRule', () => {
    it('only from ready, with reason, waiter on own table or admin', () => {
        const w = { kind: 'staff', roles: [Role.WAITER], managesTable: true } as const;
        expect(returnRule(w, 'ready')).toEqual({ allowed: true, reasonRequired: true });
        expect(returnRule(w, 'preparing')).toMatchObject({ allowed: false });
        expect(returnRule({ ...w, managesTable: false }, 'ready')).toMatchObject({
            allowed: false
        });
        expect(
            returnRule({ kind: 'staff', roles: [Role.RESTAURANT_ADMIN] }, 'ready')
        ).toMatchObject({ allowed: true });
        expect(
            returnRule({ kind: 'staff', roles: [Role.KITCHEN] }, 'ready')
        ).toMatchObject({ allowed: false });
        expect(returnRule({ kind: 'customer' }, 'ready')).toMatchObject({
            allowed: false
        });
    });
});
