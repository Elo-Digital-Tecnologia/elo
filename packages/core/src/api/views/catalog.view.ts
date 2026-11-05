import type { CategoryKind } from '../../catalog/category-kinds.js';
import type { FlavorPricing, ProductGroupKind } from '../../catalog/option-kinds.js';
import type { ProductTag } from '../../catalog/product-tags.js';

export interface OptionChoice {
    label: string;
    /** Extra: what it adds. Size: the full price. */
    priceCents: number;
}

export interface OptionGroup {
    name: string;
    /** Absent on extras saved before kinds existed. */
    kind?: ProductGroupKind;
    required: boolean;
    multiple: boolean;
    choices: OptionChoice[];
}

export interface PizzaSize {
    /** Stable id, so renaming a size keeps the prices tied to it. */
    id: string;
    label: string;
    maxFlavors: number;
}

export interface PizzaAddonChoice {
    label: string;
    /** Price by size id; a size without one does not offer the choice. */
    sizePrices: Record<string, number>;
}

/** Shared choices of every flavor in the category (border, dough). */
export interface PizzaAddonGroup {
    name: string;
    required: boolean;
    multiple: boolean;
    choices: PizzaAddonChoice[];
}

/** What every flavor of a pizza category shares. */
export interface PizzaSetup {
    /** Names the guest sees for the size and flavor steps ("Tamanho", "Sabores"). */
    sizesName: string;
    flavorsName: string;
    sizes: PizzaSize[];
    flavorPricing: FlavorPricing;
    addons: PizzaAddonGroup[];
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
    /** Pizza flavor: its price by size id. Empty elsewhere. */
    sizePrices: Record<string, number>;
}

export interface CategoryView {
    id: string;
    name: string;
    position: number;
    kind: CategoryKind;
    /** Set on pizza categories only. */
    pizza: PizzaSetup | null;
    products: ProductView[];
}
