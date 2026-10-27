import type { Product } from '../database/entities';
import { priceItem } from './pricing';

const pizza = {
  id: 'p1',
  name: 'Pizza',
  priceCents: 4000,
  available: true,
  options: [
    {
      name: 'Tamanho',
      required: true,
      multiple: false,
      choices: [
        { label: 'M', priceCents: 0 },
        { label: 'G', priceCents: 1000 },
      ],
    },
    {
      name: 'Adicionais',
      required: false,
      multiple: true,
      choices: [{ label: 'Borda', priceCents: 500 }],
    },
  ],
} as unknown as Product;

describe('priceItem', () => {
  it('sums base and chosen options', () => {
    const item = priceItem(pizza, {
      productId: 'p1',
      quantity: 2,
      options: [
        { group: 'Tamanho', label: 'G' },
        { group: 'Adicionais', label: 'Borda' },
      ],
    });
    expect(item.unitCents).toBe(5500);
  });
  it('requires required group', () => {
    expect(() => priceItem(pizza, { productId: 'p1', quantity: 1 })).toThrow('missing_required_option');
  });
  it('rejects unknown option and double single-choice', () => {
    expect(() =>
      priceItem(pizza, { productId: 'p1', quantity: 1, options: [{ group: 'Tamanho', label: 'XG' }] }),
    ).toThrow('invalid_option');
    expect(() =>
      priceItem(pizza, {
        productId: 'p1',
        quantity: 1,
        options: [
          { group: 'Tamanho', label: 'M' },
          { group: 'Tamanho', label: 'G' },
        ],
      }),
    ).toThrow('too_many_options');
  });
  it('rejects unavailable product', () => {
    expect(() => priceItem({ ...pizza, available: false }, { productId: 'p1', quantity: 1 })).toThrow(
      'product_unavailable',
    );
  });
});
