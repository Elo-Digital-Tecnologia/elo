import type { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import { describe, expect, it } from 'vitest';
import { InvalidOptionException } from '../exceptions/invalid-option.exception.js';
import { MissingRequiredOptionException } from '../exceptions/missing-required-option.exception.js';
import { ProductUnavailableException } from '../exceptions/product-unavailable.exception.js';
import { TooManyOptionsException } from '../exceptions/too-many-options.exception.js';
import { priceItem } from './pricing.js';

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
                { label: 'G', priceCents: 1000 }
            ]
        },
        {
            name: 'Adicionais',
            required: false,
            multiple: true,
            choices: [{ label: 'Borda', priceCents: 500 }]
        }
    ]
} as unknown as ProductEntity;

describe('priceItem', () => {
    it('sums base and chosen options', () => {
        const item = priceItem(pizza, {
            productId: 'p1',
            quantity: 2,
            options: [
                { group: 'Tamanho', label: 'G' },
                { group: 'Adicionais', label: 'Borda' }
            ]
        });
        expect(item.unitCents).toBe(5500);
    });
    it('requires required group', () => {
        expect(() => priceItem(pizza, { productId: 'p1', quantity: 1 })).toThrow(
            MissingRequiredOptionException
        );
    });
    it('rejects unknown option and double single-choice', () => {
        expect(() =>
            priceItem(pizza, {
                productId: 'p1',
                quantity: 1,
                options: [{ group: 'Tamanho', label: 'XG' }]
            })
        ).toThrow(InvalidOptionException);
        expect(() =>
            priceItem(pizza, {
                productId: 'p1',
                quantity: 1,
                options: [
                    { group: 'Tamanho', label: 'M' },
                    { group: 'Tamanho', label: 'G' }
                ]
            })
        ).toThrow(TooManyOptionsException);
    });
    it('rejects unavailable product', () => {
        expect(() =>
            priceItem({ ...pizza, available: false }, { productId: 'p1', quantity: 1 })
        ).toThrow(ProductUnavailableException);
    });
    it('prices by size and by the highest flavor', () => {
        const halfAndHalf = {
            id: 'p2',
            name: 'Pizza meio a meio',
            priceCents: 0,
            available: true,
            options: [
                {
                    name: 'Tamanho',
                    kind: 'size',
                    required: true,
                    multiple: false,
                    choices: [
                        { label: 'M', priceCents: 0, maxFlavors: 1 },
                        { label: 'G', priceCents: 0, maxFlavors: 2 }
                    ]
                },
                {
                    name: 'Sabores',
                    kind: 'flavor',
                    required: true,
                    multiple: true,
                    flavorPricing: 'highest',
                    choices: [
                        {
                            label: 'Calabresa',
                            priceCents: 0,
                            sizePrices: { M: 5000, G: 6000 }
                        },
                        {
                            label: 'Camarão',
                            priceCents: 0,
                            sizePrices: { M: 6500, G: 8000 }
                        }
                    ]
                }
            ]
        } as unknown as ProductEntity;
        const both = [
            { group: 'Sabores', label: 'Calabresa' },
            { group: 'Sabores', label: 'Camarão' }
        ];
        const item = priceItem(halfAndHalf, {
            productId: 'p2',
            quantity: 1,
            options: [{ group: 'Tamanho', label: 'G' }, ...both]
        });
        expect(item.unitCents).toBe(8000);
        expect(() =>
            priceItem(halfAndHalf, {
                productId: 'p2',
                quantity: 1,
                options: [{ group: 'Tamanho', label: 'M' }, ...both]
            })
        ).toThrow(TooManyOptionsException);
    });
});
