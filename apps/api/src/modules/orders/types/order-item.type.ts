import type { OrderItemOptionView } from '@elo/core/api/views/order.view';

export interface OrderItem {
    productId: string;
    name: string;
    unitCents: number;
    quantity: number;
    notes?: string | undefined;
    options: OrderItemOptionView[];
}
