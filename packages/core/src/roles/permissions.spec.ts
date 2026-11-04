import { describe, expect, it } from 'vitest';
import { canGrant, upgradePermissions, withRequired } from './permissions.js';

describe('permissions', () => {
    it('adds what each permission depends on', () => {
        expect(withRequired(['payments.record'])).toEqual([
            'restaurants.view',
            'payments.view',
            'payments.record'
        ]);
        expect(withRequired(['team.manage'])).toEqual(['team.manage']);
    });
    it('reads the names used before the split', () => {
        expect(upgradePermissions(['subscriptions', 'access_control'])).toEqual([
            'restaurants.view',
            'restaurants.suspend',
            'payments.view',
            'payments.record'
        ]);
        expect(upgradePermissions(['settings', 'restaurants.view'])).toEqual([
            'restaurants.view',
            'team.manage'
        ]);
    });
    it('only the superadmin grants deletion; others grant what they hold', () => {
        expect(
            canGrant({ superadmin: true, permissions: [] }, 'restaurants.delete')
        ).toBe(true);
        expect(
            canGrant(
                { superadmin: false, permissions: ['restaurants.delete'] },
                'restaurants.delete'
            )
        ).toBe(false);
        expect(
            canGrant(
                { superadmin: false, permissions: ['payments.view'] },
                'payments.view'
            )
        ).toBe(true);
        expect(
            canGrant(
                { superadmin: false, permissions: ['payments.view'] },
                'payments.record'
            )
        ).toBe(false);
    });
});
