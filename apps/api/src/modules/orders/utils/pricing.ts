import type { PricingProblem } from '@elo/core/catalog/product-pricing';
import type { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import type { OrderItem } from '../types/order-item.type.js';
import {
    PricingProblem as Problem,
    priceSelection
} from '@elo/core/catalog/product-pricing';
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

const EXCEPTIONS: Record<PricingProblem, new () => Error> = {
    [Problem.INVALID_OPTION]: InvalidOptionException,
    [Problem.DUPLICATE_OPTION]: DuplicateOptionException,
    [Problem.MISSING_REQUIRED]: MissingRequiredOptionException,
    [Problem.TOO_MANY]: TooManyOptionsException
};

/**
 * Validates the chosen options against the product definition and calculates the unit
 * price on the server. Prices never come from the client.
 */
export function priceItem(product: ProductEntity, req: RequestedItem): OrderItem {
    if (!product.available) throw new ProductUnavailableException();
    const priced = priceSelection(product, req.options ?? []);
    if (!priced.ok) throw new EXCEPTIONS[priced.problem]();
    return {
        productId: product.id,
        name: product.name,
        unitCents: priced.unitCents,
        quantity: req.quantity,
        notes: req.notes || undefined,
        options: priced.options
    };
}
