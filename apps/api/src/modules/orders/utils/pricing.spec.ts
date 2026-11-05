import type { CategoryEntity } from '#/modules/catalog/entities/category.entity.js';
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
    it('prices a half-and-half from its pizza category', () => {
        const ids = {
            g: '00000000-0000-4000-8000-00000000000g',
            m: '00000000-0000-4000-8000-00000000000m'
        };
        const category = {
            id: 'cat',
            name: 'Pizzas',
            kind: 'pizza',
            pizza: {
                sizesName: 'Tamanho',
                flavorsName: 'Sabores',
                flavorPricing: 'highest',
                sizes: [
                    { id: ids.m, label: 'M', maxFlavors: 1 },
                    { id: ids.g, label: 'G', maxFlavors: 2 }
                ],
                addons: []
            }
        } as unknown as CategoryEntity;
        const flavor = (id: string, name: string, m: number, g: number) =>
            ({
                id,
                name,
                categoryId: 'cat',
                available: true,
                priceCents: 0,
                options: [],
                sizePrices: { [ids.m]: m, [ids.g]: g }
            }) as unknown as ProductEntity;
        const cal = flavor('cal', 'Calabresa', 5000, 6000);
        const cam = flavor('cam', 'Camarão', 6500, 8000);
        const ctx = { category, flavors: [cal, cam] };
        const item = priceItem(
            cal,
            {
                productId: 'cal',
                quantity: 1,
                pizza: { sizeId: ids.g, flavorIds: ['cal', 'cam'] }
            },
            ctx
        );
        expect(item).toMatchObject({ name: 'Pizzas', unitCents: 8000 });
        expect(() =>
            priceItem(
                cal,
                {
                    productId: 'cal',
                    quantity: 1,
                    pizza: { sizeId: ids.m, flavorIds: ['cal', 'cam'] }
                },
                ctx
            )
        ).toThrow(TooManyOptionsException);
        expect(() => priceItem(cal, { productId: 'cal', quantity: 1 }, ctx)).toThrow(
            MissingRequiredOptionException
        );
    });
});
