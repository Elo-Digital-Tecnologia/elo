import type { OptionGroup } from '../api/views/catalog.view.js';
import { describe, expect, it } from 'vitest';
import { FlavorPricing, OptionGroupKind } from './option-kinds.js';
import {
    PricingProblem,
    combineFlavors,
    normalizeOptions,
    optionsProblems,
    priceSelection,
    startingPrice
} from './product-pricing.js';

const sizes: OptionGroup = {
    name: 'Tamanho',
    kind: OptionGroupKind.SIZE,
    required: true,
    multiple: false,
    choices: [
        { label: '300 ml', priceCents: 1500 },
        { label: '500 ml', priceCents: 2200 }
    ]
};
const extra: OptionGroup = {
    name: 'Adicionais',
    required: false,
    multiple: true,
    choices: [
        { label: 'Granola', priceCents: 300 },
        { label: 'Leite ninho', priceCents: 400 }
    ]
};
const bySize = { priceCents: 0, options: [sizes, extra] };

describe('priceSelection', () => {
    it('keeps the legacy sum for products without kinds', () => {
        const r = priceSelection({ priceCents: 3000, options: [extra] }, [
            { group: 'Adicionais', label: 'Granola' }
        ]);
        expect(r).toMatchObject({ ok: true, unitCents: 3300 });
    });

    it('takes the price from the size and adds extras', () => {
        const r = priceSelection(bySize, [
            { group: 'Tamanho', label: '500 ml' },
            { group: 'Adicionais', label: 'Granola' },
            { group: 'Adicionais', label: 'Leite ninho' }
        ]);
        expect(r).toMatchObject({ ok: true, unitCents: 2900 });
    });

    it('requires a size and only one', () => {
        expect(priceSelection(bySize, [])).toEqual({
            ok: false,
            problem: PricingProblem.MISSING_REQUIRED
        });
        expect(
            priceSelection(bySize, [
                { group: 'Tamanho', label: '300 ml' },
                { group: 'Tamanho', label: '500 ml' }
            ])
        ).toEqual({ ok: false, problem: PricingProblem.TOO_MANY });
    });

    it('treats a retired kind as an extra', () => {
        const old = { ...extra, kind: 'flavor' } as unknown as OptionGroup;
        const r = priceSelection({ priceCents: 1000, options: [old] }, [
            { group: 'Adicionais', label: 'Granola' }
        ]);
        expect(r).toMatchObject({ ok: true, unitCents: 1300 });
    });
});

describe('startingPrice', () => {
    it('is the plain price when nothing varies', () => {
        expect(startingPrice({ priceCents: 3000, options: [extra] })).toEqual({
            cents: 3000,
            varies: false
        });
    });
    it('is the cheapest size', () => {
        expect(startingPrice(bySize)).toEqual({ cents: 1500, varies: true });
    });
});

describe('combineFlavors', () => {
    it('charges the highest or the average rounded up', () => {
        expect(combineFlavors([6000, 8000], FlavorPricing.HIGHEST)).toBe(8000);
        expect(combineFlavors([6000, 8001], FlavorPricing.AVERAGE)).toBe(7001);
    });
});

describe('optionsProblems', () => {
    it('refuses a second size group and repeated labels', () => {
        const problems = optionsProblems([
            sizes,
            { ...sizes, name: 'Outro' },
            {
                ...extra,
                choices: [...extra.choices, { label: 'granola ', priceCents: 0 }]
            }
        ]);
        expect(problems.map((p) => [p.path, p.error.code])).toEqual([
            ['options.1.name', 'one_per_product'],
            ['options.2.choices.2.label', 'duplicate']
        ]);
    });
});

describe('normalizeOptions', () => {
    it('forces a size group to be required and single', () => {
        const [s] = normalizeOptions([{ ...sizes, required: false, multiple: true }]);
        expect(s).toMatchObject({ required: true, multiple: false });
    });
});
