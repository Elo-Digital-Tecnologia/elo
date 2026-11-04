export const ORDER_LIMITS = {
    itemsPerOrder: 50,
    quantityPerItem: 50,
    optionsPerItem: 20,
    /** Orders a live screen gets without asking for more. */
    listDefault: 300,
    listMax: 500,
    historyPageSize: 20,
    historyMaxPage: 1000
} as const;
