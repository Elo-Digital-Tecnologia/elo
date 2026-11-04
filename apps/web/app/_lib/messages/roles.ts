import type { Role } from '@elo/core/roles/roles';

export const ROLE_LABEL: Record<Role, string> = {
    superadmin: 'Superadmin',
    elo_admin: 'Equipe Elo',
    restaurant_admin: 'Titular',
    manager: 'Gerente',
    waiter: 'Garçom',
    kitchen: 'Cozinha',
    cashier: 'Caixa'
};
