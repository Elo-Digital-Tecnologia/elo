import { Role } from './roles';
import type { OrderStatus } from './orders';

export type CancelActor =
  | { kind: 'customer' }
  | { kind: 'staff'; roles: readonly Role[]; managesTable?: boolean };

const MANAGERS: Role[] = [Role.RestaurantAdmin, Role.EloAdmin, Role.Superadmin];

export type CancelDecision =
  | { allowed: true; reasonRequired: boolean; notifyKitchen: boolean }
  | { allowed: false; why: string };

/**
 * Regras de cancelamento (REFERENCE). Cliente: antes do preparo. Garçom: até
 * "em preparo", só mesas que atende, motivo obrigatório. Administrador: até
 * "em preparo", motivo obrigatório. Depois de "pronto" o cancelamento não é
 * permitido para ninguém; o tratamento é o status separado "devolvido"
 * (`returnRule`).
 */
export function cancellationRule(actor: CancelActor, status: OrderStatus): CancelDecision {
  if (status === 'cancelled' || status === 'returned') return { allowed: false, why: 'already_closed' };
  if (status === 'ready') return { allowed: false, why: 'use_return' };
  const notifyKitchen = status === 'preparing';

  if (actor.kind === 'customer') {
    return status === 'sent' || status === 'received'
      ? { allowed: true, reasonRequired: false, notifyKitchen }
      : { allowed: false, why: 'preparation_started' };
  }
  if (actor.roles.some((r) => MANAGERS.includes(r))) {
    return { allowed: true, reasonRequired: true, notifyKitchen };
  }
  if (actor.roles.includes(Role.Waiter)) {
    if (!actor.managesTable) return { allowed: false, why: 'not_your_table' };
    return { allowed: true, reasonRequired: true, notifyKitchen };
  }
  return { allowed: false, why: 'role_not_allowed' };
}

export type ReturnDecision = { allowed: true; reasonRequired: true } | { allowed: false; why: string };

/**
 * Devolução/recusa de um pedido já "pronto". Garçom (mesa que atende) ou
 * administrador do restaurante, sempre com motivo. Registrada como decisão
 * pendente: o REFERENCE não diz quem executa.
 */
export function returnRule(actor: CancelActor, status: OrderStatus): ReturnDecision {
  if (status !== 'ready') return { allowed: false, why: 'not_ready' };
  if (actor.kind === 'customer') return { allowed: false, why: 'role_not_allowed' };
  if (actor.roles.includes(Role.RestaurantAdmin)) return { allowed: true, reasonRequired: true };
  if (actor.roles.includes(Role.Waiter)) {
    return actor.managesTable ? { allowed: true, reasonRequired: true } : { allowed: false, why: 'not_your_table' };
  }
  return { allowed: false, why: 'role_not_allowed' };
}
