import type { OrderStatus } from '../../orders/order-status.js';

export interface OrderItemView {
    productId: string;
    name: string;
    unitCents: number;
    quantity: number;
    notes?: string | undefined;
    options: { group: string; label: string; priceCents: number }[];
}

export interface OrderView {
    id: string;
    tableId: string;
    tableName?: string | undefined;
    status: OrderStatus;
    items: OrderItemView[];
    cancelReason: string | null;
    createdAt: string;
    /** Present on order.cancelled: the kitchen must highlight the card. */
    alertKitchen?: boolean | undefined;
}

export interface OrderHistoryItem extends OrderView {
    totalCents: number;
    /** Who opened the table for this guest visit. */
    servedBy: string | null;
    /** When the waiter closed the table; null while the guests are still there. */
    closedAt: string | null;
}

export interface OrderHistoryPage {
    items: OrderHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
    /** Set when the member's role only sees recent orders. */
    limitedFrom: string | null;
}
