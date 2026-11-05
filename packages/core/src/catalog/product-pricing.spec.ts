import type { OptionGroup } from '../api/views/catalog.view.js';
import { describe, expect, it } from 'vitest';
import { FlavorPricing, OptionGroupKind } from './option-kinds.js';
import {
    PricingProblem,
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
        { label: 'P', priceCents: 4000, maxFlavors: 1 },
        { label: 'M', priceCents: 5000, maxFlavors: 2 },
        { label: 'G', priceCents: 6000, maxFlavors: 3 }
    ]
};
const flavors = (rule: FlavorPricing): OptionGroup => ({
    name: 'Sabores',
    kind: OptionGroupKind.FLAVOR,
    required: true,
    multiple: true,
    flavorPricing: rule,
    choices: [
        { label: 'Calabresa', priceCents: 0, sizePrices: { P: 4000, M: 5000, G: 6000 } },
        { label: 'Camarão', priceCents: 0, sizePrices: { P: 5500, M: 6500, G: 8000 } },
        { label: 'Mussarela', priceCents: 0, sizePrices: { P: 3800, M: 4800, G: 5800 } }
    ]
});
const border: OptionGroup = {
    name: 'Borda',
    required: false,
    multiple: false,
    choices: [{ label: 'Catupiry', priceCents: 1000 }]
};

const bySize = { priceCents: 0, options: [sizes, border] };
const halfAndHalf = (rule: FlavorPricing) => ({
    priceCents: 0,
    options: [sizes, flavors(rule), border]
});

describe('priceSelection', () => {
    it('keeps the legacy sum for products without kinds', () => {
        const r = priceSelection({ priceCents: 3000, options: [border] }, [
            { group: 'Borda', label: 'Catupiry' }
        ]);
        expect(r).toMatchObject({ ok: true, unitCents: 4000 });
    });

    it('takes the price from the size and adds extras', () => {
        const r = priceSelection(bySize, [
            { group: 'Tamanho', label: 'M' },
            { group: 'Borda', label: 'Catupiry' }
        ]);
        expect(r).toMatchObject({ ok: true, unitCents: 6000 });
    });

    it('requires a size and only one', () => {
        expect(priceSelection(bySize, [])).toEqual({
            ok: false,
            problem: PricingProblem.MISSING_REQUIRED
        });
        expect(
            priceSelection(bySize, [
                { group: 'Tamanho', label: 'P' },
                { group: 'Tamanho', label: 'G' }
            ])
        ).toEqual({ ok: false, problem: PricingProblem.TOO_MANY });
    });

    it('charges the highest flavor at the chosen size', () => {
        const r = priceSelection(halfAndHalf(FlavorPricing.HIGHEST), [
            { group: 'Tamanho', label: 'G' },
            { group: 'Sabores', label: 'Calabresa' },
            { group: 'Sabores', label: 'Camarão' }
        ]);
        expect(r).toMatchObject({ ok: true, unitCents: 8000 });
    });

    it('charges the average, rounded up to the cent', () => {
        const r = priceSelection(halfAndHalf(FlavorPricing.AVERAGE), [
            { group: 'Tamanho', label: 'G' },
            { group: 'Sabores', label: 'Calabresa' },
            { group: 'Sabores', label: 'Camarão' },
            { group: 'Sabores', label: 'Mussarela' },
            { group: 'Borda', label: 'Catupiry' }
        ]);
        // (6000 + 8000 + 5800) / 3 = 6600, plus the border.
        expect(r).toMatchObject({ ok: true, unitCents: 7600 });
        const odd = priceSelection(halfAndHalf(FlavorPricing.AVERAGE), [
            { group: 'Tamanho', label: 'M' },
            { group: 'Sabores', label: 'Calabresa' },
            { group: 'Sabores', label: 'Mussarela' }
        ]);
        expect(odd).toMatchObject({ ok: true, unitCents: 4900 });
    });

    it('limits flavors by size and requires one', () => {
        const product = halfAndHalf(FlavorPricing.HIGHEST);
        expect(
            priceSelection(product, [
                { group: 'Tamanho', label: 'P' },
                { group: 'Sabores', label: 'Calabresa' },
                { group: 'Sabores', label: 'Camarão' }
            ])
        ).toEqual({ ok: false, problem: PricingProblem.TOO_MANY });
        expect(priceSelection(product, [{ group: 'Tamanho', label: 'G' }])).toEqual({
            ok: false,
            problem: PricingProblem.MISSING_REQUIRED
        });
    });

    it('marks each line with its kind', () => {
        const r = priceSelection(halfAndHalf(FlavorPricing.HIGHEST), [
            { group: 'Tamanho', label: 'P' },
            { group: 'Sabores', label: 'Camarão' }
        ]);
        expect(r.ok && r.options.map((o) => [o.kind, o.priceCents])).toEqual([
            [OptionGroupKind.SIZE, 0],
            [OptionGroupKind.FLAVOR, 5500]
        ]);
    });
});

describe('startingPrice', () => {
    it('is the plain price when nothing varies', () => {
        expect(startingPrice({ priceCents: 3000, options: [border] })).toEqual({
            cents: 3000,
            varies: false
        });
    });
    it('is the cheapest size or flavor', () => {
        expect(startingPrice(bySize)).toEqual({ cents: 4000, varies: true });
        expect(startingPrice(halfAndHalf(FlavorPricing.HIGHEST))).toEqual({
            cents: 3800,
            varies: true
        });
    });
});

describe('optionsProblems', () => {
    it('accepts a full half-and-half setup', () => {
        expect(optionsProblems([sizes, flavors(FlavorPricing.HIGHEST), border])).toEqual(
            []
        );
    });
    it('needs a size group before flavors and a price for every size', () => {
        const f = flavors(FlavorPricing.HIGHEST);
        expect(optionsProblems([f])[0]).toEqual({
            path: 'options.0.name',
            error: { code: 'needs_size' }
        });
        const missing: OptionGroup = {
            ...f,
            choices: [{ label: 'Calabresa', priceCents: 0, sizePrices: { P: 4000 } }]
        };
        expect(optionsProblems([sizes, missing]).map((p) => p.path)).toEqual([
            'options.1.choices.0.sizePrices.M',
            'options.1.choices.0.sizePrices.G'
        ]);
    });
    it('refuses repeated groups and labels', () => {
        const problems = optionsProblems([
            sizes,
            { ...sizes, name: 'Outro' },
            {
                ...border,
                choices: [...border.choices, { label: 'catupiry ', priceCents: 0 }]
            }
        ]);
        expect(problems.map((p) => [p.path, p.error.code])).toEqual([
            ['options.1.name', 'one_per_product'],
            ['options.2.choices.1.label', 'duplicate']
        ]);
    });
});

describe('normalizeOptions', () => {
    it('forces the rules of sizes and flavors and drops stale size prices', () => {
        const [s, f] = normalizeOptions([
            { ...sizes, required: false, multiple: true },
            {
                ...flavors(FlavorPricing.AVERAGE),
                required: false,
                choices: [{ label: 'X', priceCents: 9, sizePrices: { P: 1, GG: 2 } }]
            }
        ]);
        expect(s).toMatchObject({ required: true, multiple: false });
        expect(s.choices[0]).toEqual({ label: 'P', priceCents: 0, maxFlavors: 1 });
        expect(f).toMatchObject({ required: true, multiple: true });
        expect(f.choices[0]).toEqual({ label: 'X', priceCents: 0, sizePrices: { P: 1 } });
    });
});
