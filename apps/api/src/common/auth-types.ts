import { Role } from '@elo/core';

/** Staff JWT payload. */
export interface JwtUser {
  sub: string;
  roles: Role[];
  /** Person's name, shown in headers and history records. */
  name?: string;
  restaurantId: string | null;
  permissions: string[];
  /** Set when the Elo team enters a restaurant panel: id of who entered ('superadmin' or a user id). */
  impersonatedBy?: string;
  /** Session the token was issued from; it stops working when that session ends. Missing on tokens issued before sessions. */
  sid?: string;
}
