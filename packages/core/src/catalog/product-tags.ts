/** Tags a restaurant can set on a product. The list is closed. */
export const PRODUCT_TAGS = [
    'vegetarian',
    'vegan',
    'gluten_free',
    'spicy',
    'new'
] as const;
export type ProductTag = (typeof PRODUCT_TAGS)[number];
