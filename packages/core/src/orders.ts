export const OrderStatus = {
  Sent: 'sent',
  Received: 'received',
  Preparing: 'preparing',
  Ready: 'ready',
  Cancelled: 'cancelled',
  /** Recusado/devolvido depois de "pronto" (cancelamento não é permitido nesse ponto). */
  Returned: 'returned',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Sequência de avanço feito pela cozinha. */
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  sent: 'received',
  received: 'preparing',
  preparing: 'ready',
};

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  return NEXT[status] ?? null;
}

const PREVIOUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'sent',
  preparing: 'received',
  ready: 'preparing',
};

/** One step back, for a status advanced by mistake. */
export function previousOrderStatus(status: OrderStatus): OrderStatus | null {
  return PREVIOUS[status] ?? null;
}

/** Sent to the kitchen and not ready yet. */
export const ORDER_IN_PROGRESS: OrderStatus[] = [OrderStatus.Sent, OrderStatus.Received, OrderStatus.Preparing];

/**
 * The guest asks for the bill only once the kitchen is done with every order:
 * the bill must not close over food still being made. The waiter still
 * confirms by closing the table.
 */
export const canRequestBill = (statuses: readonly string[]) => !statuses.some((s) => (ORDER_IN_PROGRESS as string[]).includes(s));

export const TableState = {
  Closed: 'closed',
  PendingOpen: 'pending_open',
  Open: 'open',
  PendingClose: 'pending_close',
} as const;
export type TableState = (typeof TableState)[keyof typeof TableState];

/** Floor roles (waiter, cashier, kitchen) look back this many days in the order history: enough for the shift and a guest's question. */
export const ORDER_HISTORY_FLOOR_DAYS = 2;

/** Earliest moment a member may see in the order history; null means no limit (owner and managers). */
export function orderHistoryStart(roles: readonly string[], now: Date): Date | null {
  if (roles.includes('restaurant_admin') || roles.includes('manager')) return null;
  return new Date(now.getTime() - ORDER_HISTORY_FLOOR_DAYS * 86_400_000);
}

/** What an order costs: unit price (options included) times quantity, summed. */
export const orderTotalCents = (items: readonly { unitCents: number; quantity: number }[]) => items.reduce((sum, i) => sum + i.unitCents * i.quantity, 0);
