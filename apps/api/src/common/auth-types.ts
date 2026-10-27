import { Role } from '@elo/core';

/** Conteúdo do JWT dos funcionários. */
export interface JwtUser {
  sub: string;
  role: Role;
  restaurantId: string | null;
  permissions: string[];
}
