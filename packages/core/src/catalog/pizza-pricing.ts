import type {
    PizzaAddonChoice,
    PizzaAddonGroup,
    PizzaSetup
} from '../api/views/catalog.view.js';
import type {
    ChosenOption,
    PricedOption,
    PricingResult,
    SetupProblem
} from './product-pricing.js';
import { FIELD_RULES, fieldError } from '../fields/field-rules.js';
import { OptionGroupKind } from './option-kinds.js';
import {
    PricingProblem,
    combineFlavors,
    duplicateNames,
    isRequired,
    pickChoices
} from './product-pricing.js';

/** A product of a pizza category, as pricing needs it. */
export interface PizzaFlavor {
    id: string;
    name: string;
    available: boolean;
    sizePrices: Record<string, number>;
}

/** What a guest put together: a size, one or more flavors and the add-ons. */
export interface PizzaChoice {
    sizeId: string;
    flavorIds: string[];
    addons: ChosenOption[];
}

/** Price of a flavor at a size; null when the flavor is not made in that size. */
export const flavorPriceAt = (
    flavor: { sizePrices: Record<string, number> },
    sizeId: string
) => flavor.sizePrices[sizeId] ?? null;

const addonPriceAt = (choice: PizzaAddonChoice, sizeId: string) =>
    choice.sizePrices[sizeId] ?? 0;

/**
 * Checks a pizza against its category and prices one unit: the flavors combined by the
 * category's rule at the chosen size, plus the add-ons at that size. Flavors must be
 * products of the same category; the API passes only those.
 */
export function pricePizza(
    setup: PizzaSetup,
    flavors: PizzaFlavor[],
    choice: PizzaChoice
): PricingResult {
    const fail = (problem: PricingProblem): PricingResult => ({ ok: false, problem });
    const size = setup.sizes.find((s) => s.id === choice.sizeId);
    if (!size) return fail(PricingProblem.INVALID_OPTION);

    if (!choice.flavorIds.length) return fail(PricingProblem.MISSING_REQUIRED);
    if (choice.flavorIds.length > size.maxFlavors) return fail(PricingProblem.TOO_MANY);
    if (new Set(choice.flavorIds).size !== choice.flavorIds.length)
        return fail(PricingProblem.DUPLICATE_OPTION);
    const picked: { flavor: PizzaFlavor; price: number }[] = [];
    for (const id of choice.flavorIds) {
        const flavor = flavors.find((f) => f.id === id);
        const price = flavor && flavor.available ? flavorPriceAt(flavor, size.id) : null;
        if (!flavor || price === null) return fail(PricingProblem.INVALID_OPTION);
        picked.push({ flavor, price });
    }

    const addons = pickChoices<PizzaAddonChoice, PizzaAddonGroup>(
        setup.addons,
        choice.addons
    );
    if (typeof addons === 'string') return fail(addons);
    for (const g of setup.addons) {
        const count = addons.filter((a) => a.group === g).length;
        if (isRequired(g) && count === 0) return fail(PricingProblem.MISSING_REQUIRED);
        if (!g.multiple && count > 1) return fail(PricingProblem.TOO_MANY);
    }

    const options: PricedOption[] = [
        {
            group: setup.sizesName,
            label: size.label,
            priceCents: 0,
            kind: OptionGroupKind.SIZE
        },
        ...picked.map(({ flavor, price }) => ({
            group: setup.flavorsName,
            label: flavor.name,
            priceCents: price,
            kind: OptionGroupKind.FLAVOR
        })),
        ...addons.map(({ group, choice: c }) => ({
            group: group.name,
            label: c.label,
            priceCents: addonPriceAt(c, size.id),
            kind: OptionGroupKind.EXTRA
        }))
    ];
    const base = combineFlavors(
        picked.map((p) => p.price),
        setup.flavorPricing
    );
    const extras = options
        .filter((o) => o.kind === OptionGroupKind.EXTRA)
        .reduce((s, o) => s + o.priceCents, 0);
    return { ok: true, unitCents: base + extras, options };
}

/** Cheapest whole pizza of one flavor, required add-ons included, and whether it varies by size. */
export function flavorStartingPrice(
    setup: PizzaSetup,
    flavor: { sizePrices: Record<string, number> }
): { cents: number; varies: boolean } {
    const totals = setup.sizes.flatMap((s) => {
        const price = flavorPriceAt(flavor, s.id);
        if (price === null) return [];
        const addons = setup.addons
            .filter((g) => isRequired(g) && g.choices.length)
            .reduce(
                (sum, g) =>
                    sum + Math.min(...g.choices.map((c) => addonPriceAt(c, s.id))),
                0
            );
        return [price + addons];
    });
    if (!totals.length) return { cents: 0, varies: false };
    return { cents: Math.min(...totals), varies: new Set(totals).size > 1 };
}

/**
 * Problems of a pizza setup that the field rules alone do not catch: at least one
 * size, no repeated names, a flavor limit per size and a price for every add-on at
 * every size.
 */
export function pizzaSetupProblems(setup: PizzaSetup): SetupProblem[] {
    const out: SetupProblem[] = [];
    const add = (path: string, error: SetupProblem['error'] | null) => {
        if (error) out.push({ path, error });
    };
    if (!setup.sizes.length) add('pizza.sizes', { code: 'too_few', params: { min: 1 } });
    out.push(
        ...duplicateNames(
            setup.sizes.map((s) => s.label),
            (i) => `pizza.sizes.${i}.label`
        ),
        ...duplicateNames(
            setup.addons.map((g) => g.name),
            (i) => `pizza.addons.${i}.name`
        )
    );
    if (new Set(setup.sizes.map((s) => s.id)).size !== setup.sizes.length)
        add('pizza.sizes', { code: 'invalid' });
    setup.sizes.forEach((s, i) =>
        add(
            `pizza.sizes.${i}.maxFlavors`,
            fieldError(FIELD_RULES.flavorsPerSize, s.maxFlavors)
        )
    );
    setup.addons.forEach((g, i) => {
        out.push(
            ...duplicateNames(
                g.choices.map((c) => c.label),
                (j) => `pizza.addons.${i}.choices.${j}.label`
            )
        );
        g.choices.forEach((c, j) => {
            for (const s of setup.sizes)
                add(
                    `pizza.addons.${i}.choices.${j}.sizePrices.${s.id}`,
                    fieldError(FIELD_RULES.priceCents, c.sizePrices[s.id])
                );
        });
    });
    return out;
}

/** Problems of a flavor's prices: made in at least one size, each price a valid amount. */
export function flavorPriceProblems(
    setup: PizzaSetup,
    sizePrices: Record<string, number>
): SetupProblem[] {
    const known = setup.sizes.filter((s) => sizePrices[s.id] !== undefined);
    if (!known.length)
        return [{ path: 'sizePrices', error: { code: 'too_few', params: { min: 1 } } }];
    return known.flatMap((s) => {
        const error = fieldError(FIELD_RULES.priceCents, sizePrices[s.id]);
        return error ? [{ path: `sizePrices.${s.id}`, error }] : [];
    });
}

/** Keeps only prices of sizes the category still has. */
export function knownSizePrices(
    setup: PizzaSetup,
    sizePrices: Record<string, number>
): Record<string, number> {
    const out: Record<string, number> = {};
    for (const s of setup.sizes) {
        const price = sizePrices[s.id];
        if (price !== undefined) out[s.id] = price;
    }
    return out;
}

/** The setup as stored: add-on prices only for existing sizes. */
export const normalizePizzaSetup = (setup: PizzaSetup): PizzaSetup => ({
    sizesName: setup.sizesName,
    flavorsName: setup.flavorsName,
    flavorPricing: setup.flavorPricing,
    sizes: setup.sizes.map((s) => ({
        id: s.id,
        label: s.label,
        maxFlavors: s.maxFlavors
    })),
    addons: setup.addons.map((g) => ({
        name: g.name,
        required: g.required,
        multiple: g.multiple,
        choices: g.choices.map((c) => ({
            label: c.label,
            sizePrices: knownSizePrices(setup, c.sizePrices)
        }))
    }))
});
