/**
 * Applies an order received in a realtime event to the local state, without fetching
 * the whole list again. `keep` decides whether the order still belongs on the screen
 * (e.g. the kitchen hides "ready"). Keeps the arrival order.
 */
export function upsertOrder<T extends { id: string; createdAt: string }>(
    list: T[],
    order: T,
    keep: (o: T) => boolean
): T[] {
    const without = list.filter((o) => o.id !== order.id);
    if (!keep(order)) return without;
    const at = list.findIndex((o) => o.id === order.id);
    if (at >= 0) return list.map((o) => (o.id === order.id ? order : o));
    return [...without, order].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
