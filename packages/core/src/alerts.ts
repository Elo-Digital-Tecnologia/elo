import { Role } from './roles';

/** Events that call for someone's attention, whatever screen they are on. */
export type AlertKind = 'open_request' | 'call' | 'bill_request' | 'order_ready' | 'new_order' | 'order_cancelled';

interface AlertSpec {
  roles: Role[];
  /** Panel page that handles it, relative to /r/<slug>. */
  path: string;
  title: (table: string) => string;
  body: string;
}

export const ALERTS: Record<AlertKind, AlertSpec> = {
  open_request: { roles: [Role.Waiter], path: '/waiter', title: (t) => `${t} quer abrir a mesa`, body: 'Valide a abertura no salão.' },
  call: { roles: [Role.Waiter], path: '/waiter', title: (t) => `${t} chamou o garçom`, body: 'Toque para ver os chamados.' },
  bill_request: { roles: [Role.Waiter, Role.Cashier], path: '/waiter', title: (t) => `${t} pediu a conta`, body: 'Feche a mesa quando a conta for paga.' },
  order_ready: { roles: [Role.Waiter], path: '/waiter', title: (t) => `Pedido pronto: ${t}`, body: 'Pode levar à mesa.' },
  new_order: { roles: [Role.Kitchen], path: '/kitchen', title: (t) => `Novo pedido: ${t}`, body: 'Toque para ver a comanda.' },
  order_cancelled: { roles: [Role.Kitchen], path: '/kitchen', title: (t) => `Pedido cancelado: ${t}`, body: 'Pare o preparo deste pedido.' },
};

export interface Alert {
  kind: AlertKind;
  table: string;
  /** Collapses repeated alerts about the same thing into one notification. */
  tag: string;
}

/**
 * Reads a realtime event and says whether it is an alert. Shared by the
 * panel (sound and banner) and the API (push), so both alert on the same
 * things.
 */
export function alertOf(event: string, payload: unknown): Alert | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  if (event === 'table.updated') {
    const table = str(p.name) || 'Mesa';
    if (p.state === 'pending_open') return { kind: 'open_request', table, tag: `open:${str(p.id)}` };
    if (p.state === 'pending_close') return { kind: 'bill_request', table, tag: `bill:${str(p.id)}` };
    return null;
  }
  const table = str(p.tableName) || 'Mesa';
  if (event === 'call.created') return { kind: 'call', table, tag: `call:${str(p.id)}` };
  if (event === 'order.created') return { kind: 'new_order', table, tag: `order:${str(p.id)}` };
  if (event === 'order.updated' && p.status === 'ready') return { kind: 'order_ready', table, tag: `ready:${str(p.id)}` };
  if (event === 'order.cancelled' && p.alertKitchen === true) return { kind: 'order_cancelled', table, tag: `cancel:${str(p.id)}` };
  return null;
}

/** Whether a member with these roles should hear about it. */
export const alertsRole = (kind: AlertKind, roles: readonly string[]) => ALERTS[kind].roles.some((r) => roles.includes(r));
