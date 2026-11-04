import { describe, expect, it } from 'vitest';
import { Role } from './roles.js';
import { canTransferOwnership, ownershipRoles, staffRule } from './staff-rules.js';

describe('staffRule', () => {
    const owner = { sub: 'a', roles: [Role.RESTAURANT_ADMIN] };
    const ownerRow = { id: 'a', roles: [Role.RESTAURANT_ADMIN, Role.CASHIER] };
    const waiter = { id: 'w', roles: [Role.WAITER] };
    const manager = { sub: 'm', roles: [Role.MANAGER] };
    const support = { sub: 'elo:x', roles: [Role.RESTAURANT_ADMIN], impersonatedBy: 'x' };
    it('nobody archives, deactivates or changes the roles of their own account', () => {
        const me = { id: 'a', roles: owner.roles };
        expect(staffRule(owner, me, 'edit')).toEqual({ allowed: true });
        for (const a of [
            'archive',
            'set_active',
            'change_roles',
            'reset_password'
        ] as const) {
            expect(staffRule(owner, me, a)).toEqual({ allowed: false, why: 'self' });
        }
    });
    it('the owner manages managers; a manager only manages the floor and kitchen team', () => {
        const otherManager = { id: 'm2', roles: [Role.MANAGER] };
        expect(staffRule(owner, otherManager, 'reset_password')).toEqual({
            allowed: true
        });
        expect(
            staffRule(owner, waiter, 'change_roles', { nextRoles: [Role.MANAGER] })
        ).toEqual({ allowed: true });
        expect(staffRule(manager, waiter, 'reset_password')).toEqual({ allowed: true });
        expect(
            staffRule(manager, waiter, 'change_roles', {
                nextRoles: [Role.WAITER, Role.CASHIER]
            })
        ).toEqual({ allowed: true });
        expect(
            staffRule(manager, waiter, 'change_roles', { nextRoles: [Role.MANAGER] })
        ).toEqual({ allowed: false, why: 'not_above' });
        expect(staffRule(manager, otherManager, 'archive')).toEqual({
            allowed: false,
            why: 'not_above'
        });
        expect(staffRule(manager, ownerRow, 'edit')).toEqual({
            allowed: false,
            why: 'not_above'
        });
        expect(staffRule(manager, { id: 'm', roles: [Role.MANAGER] }, 'edit')).toEqual({
            allowed: true
        });
    });
    it('the owner role only moves through a transfer, even for support', () => {
        expect(
            staffRule(owner, waiter, 'change_roles', {
                nextRoles: [Role.RESTAURANT_ADMIN]
            })
        ).toEqual({ allowed: false, why: 'owner' });
        expect(
            staffRule(support, ownerRow, 'change_roles', { nextRoles: [Role.WAITER] })
        ).toEqual({ allowed: false, why: 'owner' });
        expect(
            staffRule(support, ownerRow, 'change_roles', {
                nextRoles: [Role.RESTAURANT_ADMIN, Role.WAITER]
            })
        ).toEqual({ allowed: true });
        expect(staffRule(support, ownerRow, 'archive')).toEqual({
            allowed: false,
            why: 'owner'
        });
        expect(staffRule(support, ownerRow, 'set_active')).toEqual({
            allowed: false,
            why: 'owner'
        });
        expect(staffRule(support, ownerRow, 'reset_password')).toEqual({ allowed: true });
    });
    it('ownership goes to an active member and swaps the lead roles', () => {
        const member = { ...waiter, active: true, archived: false };
        expect(canTransferOwnership(ownerRow, member)).toBe(true);
        expect(canTransferOwnership(ownerRow, { ...member, active: false })).toBe(false);
        expect(canTransferOwnership(ownerRow, { ...member, archived: true })).toBe(false);
        expect(
            canTransferOwnership(ownerRow, { ...ownerRow, active: true, archived: false })
        ).toBe(false);
        expect(ownershipRoles([Role.MANAGER, Role.CASHIER], 'owner')).toEqual([
            Role.RESTAURANT_ADMIN,
            Role.CASHIER
        ]);
        expect(ownershipRoles([Role.RESTAURANT_ADMIN, Role.WAITER], 'former')).toEqual([
            Role.MANAGER,
            Role.WAITER
        ]);
    });
});
