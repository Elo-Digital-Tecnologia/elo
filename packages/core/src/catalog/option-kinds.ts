/** What an option group does to the price. A group without a kind is an extra. */
export const OptionGroupKind = {
    /** Adds its choices to the price (border, toppings). */
    EXTRA: 'extra',
    /** Each choice is the product's price (P, M, G). */
    SIZE: 'size',
    /** A pizza flavor in an order line (pizza categories only, never a product group). */
    FLAVOR: 'flavor'
} as const;
export type OptionGroupKind = (typeof OptionGroupKind)[keyof typeof OptionGroupKind];
/** Kinds a product's own option group may have. */
export const PRODUCT_GROUP_KINDS = [OptionGroupKind.EXTRA, OptionGroupKind.SIZE] as const;
export type ProductGroupKind = (typeof PRODUCT_GROUP_KINDS)[number];

/** How several flavors in one pizza are charged. */
export const FlavorPricing = {
    HIGHEST: 'highest',
    AVERAGE: 'average'
} as const;
export type FlavorPricing = (typeof FlavorPricing)[keyof typeof FlavorPricing];
export const FLAVOR_PRICINGS = Object.values(FlavorPricing);

/** Most flavors a single pizza size can take. */
export const FLAVORS_MAX = 4;
/** Flavors a size accepts when the restaurant did not say. */
export const FLAVORS_DEFAULT = 1;
