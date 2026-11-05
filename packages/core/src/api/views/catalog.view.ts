import type { FlavorPricing, OptionGroupKind } from '../../catalog/option-kinds.js';
import type { ProductTag } from '../../catalog/product-tags.js';

export interface OptionChoice {
    label: string;
    /** Extra: what it adds. Size: the full price (unused when the product has flavors). */
    priceCents: number;
    /** Size choice of a product with flavors: how many flavors it takes. */
    maxFlavors?: number;
    /** Flavor choice: its price for each size label. */
    sizePrices?: Record<string, number>;
}

export interface OptionGroup {
    name: string;
    /** Absent on extras saved before kinds existed. */
    kind?: OptionGroupKind;
    required: boolean;
    multiple: boolean;
    /** Flavor group only. */
    flavorPricing?: FlavorPricing;
    choices: OptionChoice[];
}

export interface ProductView {
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    available: boolean;
    featured: boolean;
    tags: ProductTag[];
    position: number;
    options: OptionGroup[];
}

export interface CategoryView {
    id: string;
    name: string;
    position: number;
    products: ProductView[];
}
