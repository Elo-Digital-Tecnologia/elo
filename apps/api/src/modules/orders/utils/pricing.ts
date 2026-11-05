import type { PricingProblem } from '@elo/core/catalog/product-pricing';
import type { CategoryEntity } from '#/modules/catalog/entities/category.entity.js';
import type { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import type { OrderItem } from '../types/order-item.type.js';
import { pricePizza } from '@elo/core/catalog/pizza-pricing';
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
    pizza?: { sizeId: string; flavorIds: string[] };
}

/** The pizza category of a flavor and its other flavors, loaded by the order service. */
export interface PizzaContext {
    category: CategoryEntity;
    flavors: ProductEntity[];
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
export function priceItem(
    product: ProductEntity,
    req: RequestedItem,
    pizza?: PizzaContext
): OrderItem {
    if (!product.available) throw new ProductUnavailableException();
    const setup = pizza?.category.pizza;
    if (setup && !req.pizza) throw new MissingRequiredOptionException();
    if (!setup && req.pizza) throw new InvalidOptionException();
    const priced =
        setup && req.pizza
            ? pricePizza(setup, pizza.flavors, {
                  sizeId: req.pizza.sizeId,
                  flavorIds: req.pizza.flavorIds,
                  addons: req.options ?? []
              })
            : priceSelection(product, req.options ?? []);
    if (!priced.ok) throw new EXCEPTIONS[priced.problem]();
    // The picked flavor leads; the item is named after the pizza category.
    if (setup && !req.pizza?.flavorIds.includes(product.id))
        throw new InvalidOptionException();
    return {
        productId: product.id,
        name: setup && pizza ? pizza.category.name : product.name,
        unitCents: priced.unitCents,
        quantity: req.quantity,
        notes: req.notes || undefined,
        options: priced.options
    };
}
