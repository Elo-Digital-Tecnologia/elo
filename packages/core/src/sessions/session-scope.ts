/** How long staff stay signed in. */
export const SESSION_RULES = {
    /** A session nobody used for this long ends; each use pushes the end forward. */
    idleDays: 30,
    /** Life of the access token the panels send; they renew it from the session before it runs out. */
    accessTokenMinutes: 60
} as const;

/** Where a session belongs: the Elo panel or one restaurant's panel (by its link). */
export type SessionScope = 'admin' | `r:${string}`;

const SLUG = /^[a-z0-9-]{1,80}$/;

export const restaurantScope = (slug: string): SessionScope => `r:${slug}`;

export function isSessionScope(v: unknown): v is SessionScope {
    return (
        v === 'admin' ||
        (typeof v === 'string' && v.startsWith('r:') && SLUG.test(v.slice(2)))
    );
}

/** Name of the cookie that keeps a scope's session: each panel signs in on its own. */
export const sessionCookie = (scope: SessionScope) =>
    scope === 'admin' ? 'elo_session_admin' : `elo_session_r_${scope.slice(2)}`;
