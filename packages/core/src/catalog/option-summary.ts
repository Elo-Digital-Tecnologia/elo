import type { OrderItemOptionView } from '../api/views/order.view.js';
import { OptionGroupKind } from './option-kinds.js';

/** Share of the pizza each flavor takes, by the number of flavors. */
const FLAVOR_SHARES: Record<number, string> = { 2: '½', 3: '⅓', 4: '¼' };
const FLAVOR_JOIN = ' + ';
const CHOICE_JOIN = ', ';

/**
 * The chosen options of an order item, one entry per group, in the order they were
 * picked. Flavors of a half-and-half come together with their share ("½ A + ½ B").
 */
export function summarizeOptions(
    options: OrderItemOptionView[]
): { group: string; text: string }[] {
    const groups = new Map<string, OrderItemOptionView[]>();
    for (const o of options) groups.set(o.group, [...(groups.get(o.group) ?? []), o]);
    return [...groups].map(([group, list]) => {
        if (list[0]?.kind !== OptionGroupKind.FLAVOR)
            return { group, text: list.map((o) => o.label).join(CHOICE_JOIN) };
        const share = FLAVOR_SHARES[list.length];
        return {
            group,
            text: list
                .map((o) => (share ? `${share} ${o.label}` : o.label))
                .join(FLAVOR_JOIN)
        };
    });
}
