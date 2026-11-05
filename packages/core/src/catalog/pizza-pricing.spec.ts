import type { PizzaSetup } from '../api/views/catalog.view.js';
import type { PizzaFlavor } from './pizza-pricing.js';
import { describe, expect, it } from 'vitest';
import { FlavorPricing, OptionGroupKind } from './option-kinds.js';
import {
    flavorPriceProblems,
    flavorStartingPrice,
    pizzaSetupProblems,
    pricePizza
} from './pizza-pricing.js';
import { PricingProblem } from './product-pricing.js';

const setup = (rule: FlavorPricing): PizzaSetup => ({
    sizesName: 'Tamanho',
    flavorsName: 'Sabores',
    flavorPricing: rule,
    sizes: [
        { id: 'p', label: 'P', maxFlavors: 1 },
        { id: 'm', label: 'M', maxFlavors: 2 },
        { id: 'g', label: 'G', maxFlavors: 3 }
    ],
    addons: [
        {
            name: 'Borda',
            required: false,
            multiple: false,
            choices: [{ label: 'Catupiry', sizePrices: { p: 600, m: 800, g: 1000 } }]
        }
    ]
});
const flavors: PizzaFlavor[] = [
    {
        id: 'cal',
        name: 'Calabresa',
        available: true,
        sizePrices: { p: 4000, m: 5000, g: 6000 }
    },
    { id: 'cam', name: 'Camarão', available: true, sizePrices: { m: 6500, g: 8000 } },
    {
        id: 'mus',
        name: 'Mussarela',
        available: false,
        sizePrices: { p: 3800, m: 4800, g: 5800 }
    }
];

describe('pricePizza', () => {
    it('combines flavors at the size and adds the border at that size', () => {
        const r = pricePizza(setup(FlavorPricing.AVERAGE), flavors, {
            sizeId: 'g',
            flavorIds: ['cal', 'cam'],
            addons: [{ group: 'Borda', label: 'Catupiry' }]
        });
        expect(r).toMatchObject({ ok: true, unitCents: 8000 });
        expect(r.ok && r.options.map((o) => [o.kind, o.label, o.priceCents])).toEqual([
            [OptionGroupKind.SIZE, 'G', 0],
            [OptionGroupKind.FLAVOR, 'Calabresa', 6000],
            [OptionGroupKind.FLAVOR, 'Camarão', 8000],
            [OptionGroupKind.EXTRA, 'Catupiry', 1000]
        ]);
    });

    it('charges the most expensive flavor', () => {
        const r = pricePizza(setup(FlavorPricing.HIGHEST), flavors, {
            sizeId: 'm',
            flavorIds: ['cal', 'cam'],
            addons: []
        });
        expect(r).toMatchObject({ ok: true, unitCents: 6500 });
    });

    it('refuses too many, repeated, unavailable or unmade flavors', () => {
        const s = setup(FlavorPricing.HIGHEST);
        const at = (sizeId: string, flavorIds: string[]) =>
            pricePizza(s, flavors, { sizeId, flavorIds, addons: [] });
        expect(at('p', ['cal', 'cam'])).toEqual({
            ok: false,
            problem: PricingProblem.TOO_MANY
        });
        expect(at('g', ['cal', 'cal'])).toEqual({
            ok: false,
            problem: PricingProblem.DUPLICATE_OPTION
        });
        expect(at('g', ['mus'])).toEqual({
            ok: false,
            problem: PricingProblem.INVALID_OPTION
        });
        expect(at('p', ['cam'])).toEqual({
            ok: false,
            problem: PricingProblem.INVALID_OPTION
        });
        expect(at('x', ['cal'])).toEqual({
            ok: false,
            problem: PricingProblem.INVALID_OPTION
        });
        expect(at('g', [])).toEqual({
            ok: false,
            problem: PricingProblem.MISSING_REQUIRED
        });
    });
});

describe('flavorStartingPrice', () => {
    it('is the cheapest size the flavor is made in', () => {
        expect(flavorStartingPrice(setup(FlavorPricing.HIGHEST), flavors[1])).toEqual({
            cents: 6500,
            varies: true
        });
    });
});

describe('pizzaSetupProblems', () => {
    it('accepts a full setup', () => {
        expect(pizzaSetupProblems(setup(FlavorPricing.HIGHEST))).toEqual([]);
    });
    it('needs sizes, limits flavors and prices every add-on at every size', () => {
        const s = setup(FlavorPricing.HIGHEST);
        const bad: PizzaSetup = {
            ...s,
            sizes: [...s.sizes, { id: 'f', label: 'g', maxFlavors: 9 }]
        };
        expect(pizzaSetupProblems(bad).map((p) => [p.path, p.error.code])).toEqual([
            ['pizza.sizes.3.label', 'duplicate'],
            ['pizza.sizes.3.maxFlavors', 'too_large'],
            ['pizza.addons.0.choices.0.sizePrices.f', 'required']
        ]);
        expect(pizzaSetupProblems({ ...s, sizes: [], addons: [] })[0].path).toBe(
            'pizza.sizes'
        );
    });
});

describe('flavorPriceProblems', () => {
    it('needs at least one known size', () => {
        expect(flavorPriceProblems(setup(FlavorPricing.HIGHEST), { x: 100 })).toEqual([
            { path: 'sizePrices', error: { code: 'too_few', params: { min: 1 } } }
        ]);
    });
});
