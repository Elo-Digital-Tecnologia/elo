/** What an option group does to the price. A group without a kind is an extra. */
export const OptionGroupKind = {
    /** Adds its choices to the price (border, toppings). */
    EXTRA: 'extra',
    /** Each choice is the product's price (P, M, G). */
    SIZE: 'size',
    /** Half-and-half: flavors priced per size, combined by the group's rule. */
    FLAVOR: 'flavor'
} as const;
export type OptionGroupKind = (typeof OptionGroupKind)[keyof typeof OptionGroupKind];
export const OPTION_GROUP_KINDS = Object.values(OptionGroupKind);

/** How several flavors in one item are charged. */
export const FlavorPricing = {
    HIGHEST: 'highest',
    AVERAGE: 'average'
} as const;
export type FlavorPricing = (typeof FlavorPricing)[keyof typeof FlavorPricing];
export const FLAVOR_PRICINGS = Object.values(FlavorPricing);

/** Most flavors a single size can take. */
export const FLAVORS_MAX = 4;
/** Flavors a size accepts when the restaurant did not say. */
export const FLAVORS_DEFAULT = 1;
