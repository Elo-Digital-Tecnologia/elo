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

/** What the guest at the table hears about. */
export type GuestAlertKind = 'table_opened' | 'order_preparing' | 'order_ready' | 'call_answered' | 'table_closed';

export interface GuestAlert {
  kind: GuestAlertKind;
  title: string;
  body: string;
  tag: string;
}

/**
 * Reads a realtime event sent to a table and says whether the guest should be
 * told. Shared by the guest page (sound and banner) and the API (push).
 * Table events carry `change`, so a waiter taking over the table is not
 * mistaken for the table being opened.
 */
export function guestAlertOf(event: string, payload: unknown): GuestAlert | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const who = str((p.handledBy as { name?: unknown } | null | undefined)?.name);
  if (event === 'table.updated') {
    const id = str(p.id);
    if (p.change === 'opened') return { kind: 'table_opened', title: 'Sua mesa foi aberta', body: `${who || 'O garçom'} liberou os pedidos. Bom apetite!`, tag: `opened:${id}` };
    if (p.change === 'closed') return { kind: 'table_closed', title: 'Mesa fechada', body: 'Obrigado pela visita! Volte sempre.', tag: `closed:${id}` };
    return null;
  }
  const items = Array.isArray(p.items) ? (p.items as { quantity?: unknown; name?: unknown }[]).map((i) => `${i.quantity}x ${str(i.name)}`).join(', ') : '';
  if (event === 'order.updated' && p.status === 'preparing') return { kind: 'order_preparing', title: 'Seu pedido está em preparo', body: items, tag: `order:${str(p.id)}` };
  if (event === 'order.updated' && p.status === 'ready') return { kind: 'order_ready', title: 'Seu pedido está pronto', body: items || 'Logo chega à mesa.', tag: `order:${str(p.id)}` };
  if (event === 'call.resolved') return { kind: 'call_answered', title: who ? `${who} está indo até você` : 'O garçom está indo até você', body: 'Seu chamado foi atendido.', tag: `call:${str(p.id)}` };
  return null;
}
