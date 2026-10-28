import { Role } from '@elo/core';

/** Conteúdo do JWT dos funcionários. */
export interface JwtUser {
  sub: string;
  role: Role;
  restaurantId: string | null;
  permissions: string[];
  /** Presente quando a equipe Elo entra no painel de um restaurante: id de quem entrou ('superadmin' ou usuário). */
  impersonatedBy?: string;
}
