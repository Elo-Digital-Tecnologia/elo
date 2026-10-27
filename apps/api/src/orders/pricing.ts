import { BadRequestException } from '@nestjs/common';
import type { OrderItem, Product } from '../database/entities';

export interface RequestedItem {
  productId: string;
  quantity: number;
  notes?: string;
  options?: { group: string; label: string }[];
}

/**
 * Valida as opções escolhidas contra a definição do produto e calcula o preço
 * unitário no servidor. Nada de preço vindo do cliente.
 */
export function priceItem(product: Product, req: RequestedItem): OrderItem {
  if (!product.available) throw new BadRequestException('product_unavailable');
  const chosen = req.options ?? [];
  const seen = new Set<string>();
  const options: OrderItem['options'] = [];

  for (const { group, label } of chosen) {
    const def = product.options.find((g) => g.name === group);
    const choice = def?.choices.find((c) => c.label === label);
    if (!def || !choice) throw new BadRequestException('invalid_option');
    const key = `${group}\u0000${label}`;
    if (seen.has(key)) throw new BadRequestException('duplicate_option');
    seen.add(key);
    options.push({ group, label, priceCents: choice.priceCents });
  }

  for (const def of product.options) {
    const count = options.filter((o) => o.group === def.name).length;
    if (def.required && count === 0) throw new BadRequestException('missing_required_option');
    if (!def.multiple && count > 1) throw new BadRequestException('too_many_options');
  }

  return {
    productId: product.id,
    name: product.name,
    unitCents: product.priceCents + options.reduce((s, o) => s + o.priceCents, 0),
    quantity: req.quantity,
    notes: req.notes,
    options,
  };
}
