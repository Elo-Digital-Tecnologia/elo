/** Valores monetários sempre em centavos (inteiro). */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function splitEqually(totalCents: number, people: number): number[] {
  if (!Number.isInteger(people) || people < 1) throw new RangeError('people must be >= 1');
  const base = Math.floor(totalCents / people);
  const rest = totalCents - base * people;
  return Array.from({ length: people }, (_, i) => base + (i < rest ? 1 : 0));
}

/** "12,50" ou "12.50" → 1250. Retorna null se inválido. */
export function parseCents(input: string): number | null {
  const m = /^\s*(\d+)(?:[.,](\d{1,2}))?\s*$/.exec(input);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
}
