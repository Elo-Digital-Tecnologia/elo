/**
 * Aplica no estado local o pedido recebido num evento em tempo real, sem refazer
 * o GET da lista inteira. `keep` decide se o pedido ainda pertence à tela
 * (ex.: a cozinha esconde "pronto"). Mantém a ordem de chegada.
 */
export function upsertOrder<T extends { id: string; createdAt: string }>(
  list: T[],
  order: T,
  keep: (o: T) => boolean,
): T[] {
  const without = list.filter((o) => o.id !== order.id);
  if (!keep(order)) return without;
  const at = list.findIndex((o) => o.id === order.id);
  if (at >= 0) return list.map((o) => (o.id === order.id ? order : o));
  return [...without, order].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
