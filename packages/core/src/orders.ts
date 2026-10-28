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

export const TableState = {
  Closed: 'closed',
  PendingOpen: 'pending_open',
  Open: 'open',
  PendingClose: 'pending_close',
} as const;
export type TableState = (typeof TableState)[keyof typeof TableState];
