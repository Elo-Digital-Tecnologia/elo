/**
 * What the guest's device keeps between reloads. Keys name the restaurant only, never the
 * table link: the token must not stay on the device after the session starts.
 */
const CART_PREFIX = 'elo.cart.';
const PUSH_INVITE_DISMISSED_PREFIX = 'elo.push-invite-dismissed.';
/** Older versions kept `elo.guest-alerts.<token>`. */
const LEGACY_TOKEN_PREFIX = 'elo.guest-alerts.';

export const cartKey = (slug: string) => `${CART_PREFIX}${slug}`;
export const pushInviteDismissedKey = (slug: string) =>
    `${PUSH_INVITE_DISMISSED_PREFIX}${slug}`;

/**
 * Drops keys of older versions that carried the table token: `elo.cart.<slug>.<token>`
 * (slugs have no dot) and `elo.guest-alerts.<token>`.
 */
export function forgetTokenKeys() {
    try {
        const stale = Object.keys(localStorage).filter(
            (k) =>
                k.startsWith(LEGACY_TOKEN_PREFIX) ||
                (k.startsWith(CART_PREFIX) && k.slice(CART_PREFIX.length).includes('.'))
        );
        for (const k of stale) localStorage.removeItem(k);
    } catch {
        /* storage unavailable */
    }
}
