export interface TokenPayload {
    sub: string;
    roles: string[];
    /** Missing on tokens issued before team members had names. */
    name?: string;
    restaurantId: string | null;
    permissions: string[];
    /** Present when the Elo team entered the restaurant panel. */
    impersonatedBy?: string;
    exp: number;
}

/** The token's claims, expired or not. */
function readClaims(token: string): TokenPayload | null {
    try {
        const json = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(json) as Omit<TokenPayload, 'roles'> & {
            roles?: string[];
            role?: string;
        };
        // Tokens issued before multiple roles carry a single `role`.
        const roles = payload.roles ?? (payload.role ? [payload.role] : []);
        return { ...payload, roles };
    } catch {
        return null;
    }
}

/** The claims of a token still in force; null once it expired. */
export function decodeToken(token: string): TokenPayload | null {
    const payload = readClaims(token);
    return payload && payload.exp * 1000 > Date.now() ? payload : null;
}
