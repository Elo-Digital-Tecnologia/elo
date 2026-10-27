import { Role } from './roles';
import type { OrderStatus } from './orders';

export type CancelActor =
  | { kind: 'customer' }
  | { kind: 'staff'; role: Role; managesTable?: boolean };

export type CancelDecision =
  | { allowed: true; reasonRequired: boolean; notifyKitchen: boolean }
  | { allowed: false; why: string };

/**
 * Regras de cancelamento (REFERENCE). Cliente: antes do preparo. Garçom: até
 * "em preparo", só mesas que atende, motivo obrigatório. Administrador: qualquer
 * status ainda não cancelado, motivo obrigatório. Pós-"pronto" para os demais
 * usa status separado (fora do escopo P0).
 */
export function cancellationRule(actor: CancelActor, status: OrderStatus): CancelDecision {
  if (status === 'cancelled') return { allowed: false, why: 'already_cancelled' };
  const notifyKitchen = status === 'preparing';

  if (actor.kind === 'customer') {
    return status === 'sent' || status === 'received'
      ? { allowed: true, reasonRequired: false, notifyKitchen }
      : { allowed: false, why: 'preparation_started' };
  }
  if (actor.role === Role.Waiter) {
    if (!actor.managesTable) return { allowed: false, why: 'not_your_table' };
    return status === 'ready'
      ? { allowed: false, why: 'already_ready' }
      : { allowed: true, reasonRequired: true, notifyKitchen };
  }
  if (
    actor.role === Role.RestaurantAdmin ||
    actor.role === Role.EloAdmin ||
    actor.role === Role.Superadmin
  ) {
    return { allowed: true, reasonRequired: true, notifyKitchen };
  }
  return { allowed: false, why: 'role_not_allowed' };
}
