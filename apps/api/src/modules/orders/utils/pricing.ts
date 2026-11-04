import type { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import type { OrderItem } from '../types/order-item.type.js';
import { DuplicateOptionException } from '../exceptions/duplicate-option.exception.js';
import { InvalidOptionException } from '../exceptions/invalid-option.exception.js';
import { MissingRequiredOptionException } from '../exceptions/missing-required-option.exception.js';
import { ProductUnavailableException } from '../exceptions/product-unavailable.exception.js';
import { TooManyOptionsException } from '../exceptions/too-many-options.exception.js';

export interface RequestedItem {
    productId: string;
    quantity: number;
    notes?: string | null;
    options?: { group: string; label: string }[];
}

/**
 * Validates the chosen options against the product definition and calculates the unit
 * price on the server. Prices never come from the client.
 */
export function priceItem(product: ProductEntity, req: RequestedItem): OrderItem {
    if (!product.available) throw new ProductUnavailableException();
    const chosen = req.options ?? [];
    const seen = new Set<string>();
    const options: OrderItem['options'] = [];

    for (const { group, label } of chosen) {
        const def = product.options.find((g) => g.name === group);
        const choice = def?.choices.find((c) => c.label === label);
        if (!def || !choice) throw new InvalidOptionException();
        const key = `${group}\u0000${label}`;
        if (seen.has(key)) throw new DuplicateOptionException();
        seen.add(key);
        options.push({ group, label, priceCents: choice.priceCents });
    }

    for (const def of product.options) {
        const count = options.filter((o) => o.group === def.name).length;
        if (def.required && count === 0) throw new MissingRequiredOptionException();
        if (!def.multiple && count > 1) throw new TooManyOptionsException();
    }

    return {
        productId: product.id,
        name: product.name,
        unitCents: product.priceCents + options.reduce((s, o) => s + o.priceCents, 0),
        quantity: req.quantity,
        notes: req.notes || undefined,
        options
    };
}
