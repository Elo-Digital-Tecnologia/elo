export interface OrderItem {
    productId: string;
    name: string;
    unitCents: number;
    quantity: number;
    notes?: string | undefined;
    options: { group: string; label: string; priceCents: number }[];
}
