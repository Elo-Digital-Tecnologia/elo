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
