/** What a category holds. A pizza category's products are flavors that share its sizes and add-ons. */
export const CategoryKind = {
    STANDARD: 'standard',
    PIZZA: 'pizza'
} as const;
export type CategoryKind = (typeof CategoryKind)[keyof typeof CategoryKind];
export const CATEGORY_KINDS = Object.values(CategoryKind);
