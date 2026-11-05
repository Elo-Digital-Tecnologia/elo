import type { OptionChoice, OptionGroup } from '../api/views/catalog.view.js';
import type { FieldError } from '../fields/field-rules.js';
import type { ProductGroupKind } from './option-kinds.js';
import { FlavorPricing, OptionGroupKind } from './option-kinds.js';

export interface PricedProduct {
    priceCents: number;
    options: OptionGroup[];
}

export interface ChosenOption {
    group: string;
    label: string;
}

/** A chosen option and what it contributed to the unit price. */
export interface PricedOption extends ChosenOption {
    priceCents: number;
    kind: OptionGroupKind;
}

export const PricingProblem = {
    INVALID_OPTION: 'invalid_option',
    DUPLICATE_OPTION: 'duplicate_option',
    MISSING_REQUIRED: 'missing_required',
    TOO_MANY: 'too_many'
} as const;
export type PricingProblem = (typeof PricingProblem)[keyof typeof PricingProblem];

export type PricingResult =
    | { ok: true; unitCents: number; options: PricedOption[] }
    | { ok: false; problem: PricingProblem };

/** A problem in a setup, at the path the form uses (`options.0.choices.1.label`). */
export interface SetupProblem {
    path: string;
    error: FieldError;
}

/** Anything that is not a size group is an extra (including kinds no longer in use). */
export const kindOf = (g: OptionGroup): ProductGroupKind =>
    g.kind === OptionGroupKind.SIZE ? OptionGroupKind.SIZE : OptionGroupKind.EXTRA;

export const sizeGroupOf = (groups: OptionGroup[]) =>
    groups.find((g) => kindOf(g) === OptionGroupKind.SIZE);

/** The size decides the price, so the product has no price of its own. */
export const pricedBySize = (groups: OptionGroup[]) => !!sizeGroupOf(groups);

/** Price of several flavors in one pizza. The average rounds up to the cent. */
export function combineFlavors(prices: number[], rule: FlavorPricing): number {
    if (!prices.length) return 0;
    if (rule === FlavorPricing.AVERAGE)
        return Math.ceil(prices.reduce((s, p) => s + p, 0) / prices.length);
    return Math.max(...prices);
}

/** Order in which a guest fills the groups: the size first. */
export const groupsInFillOrder = (groups: OptionGroup[]) =>
    [...groups].sort(
        (a, b) =>
            Number(kindOf(b) === OptionGroupKind.SIZE) -
            Number(kindOf(a) === OptionGroupKind.SIZE)
    );

/** Required groups: sizes always, extras when marked. */
export const isRequired = (g: { required: boolean; kind?: string }) =>
    g.required || g.kind === OptionGroupKind.SIZE;

/** Most choices a group takes. */
const maxOf = (g: OptionGroup) =>
    kindOf(g) === OptionGroupKind.SIZE || !g.multiple ? 1 : Infinity;

/** Duplicate keys and unknown choices, shared by products and pizza add-ons. */
export function pickChoices<
    C extends { label: string },
    G extends { name: string; choices: C[] }
>(groups: G[], chosen: ChosenOption[]): { group: G; choice: C }[] | PricingProblem {
    const seen = new Set<string>();
    const picked: { group: G; choice: C }[] = [];
    for (const { group, label } of chosen) {
        const def = groups.find((g) => g.name === group);
        const choice = def?.choices.find((c) => c.label === label);
        if (!def || !choice) return PricingProblem.INVALID_OPTION;
        const key = `${group}\u0000${label}`;
        if (seen.has(key)) return PricingProblem.DUPLICATE_OPTION;
        seen.add(key);
        picked.push({ group: def, choice });
    }
    return picked;
}

/**
 * Checks a guest's choices against the product and prices one unit. The API trusts
 * only this result; the menu uses the same function to show the price as it changes.
 */
export function priceSelection(
    product: PricedProduct,
    chosen: ChosenOption[]
): PricingResult {
    const picked = pickChoices<OptionChoice, OptionGroup>(product.options, chosen);
    if (typeof picked === 'string') return { ok: false, problem: picked };

    for (const def of product.options) {
        const count = picked.filter((p) => p.group === def).length;
        if (isRequired({ ...def, kind: kindOf(def) }) && count === 0)
            return { ok: false, problem: PricingProblem.MISSING_REQUIRED };
        if (count > maxOf(def)) return { ok: false, problem: PricingProblem.TOO_MANY };
    }

    const sizeGroup = sizeGroupOf(product.options);
    const options: PricedOption[] = picked.map(({ group, choice }) => ({
        group: group.name,
        label: choice.label,
        priceCents: choice.priceCents,
        kind: kindOf(group)
    }));
    const base = sizeGroup ? 0 : product.priceCents;
    return {
        ok: true,
        unitCents: base + options.reduce((s, o) => s + o.priceCents, 0),
        options
    };
}

/** Cheapest price the guest can reach, and whether the price changes with the choices ("from R$ X"). */
export function startingPrice(product: PricedProduct): {
    cents: number;
    varies: boolean;
} {
    let cents = pricedBySize(product.options) ? 0 : product.priceCents;
    let varies = false;
    for (const g of product.options) {
        if (!isRequired({ ...g, kind: kindOf(g) }) || !g.choices.length) continue;
        const prices = g.choices.map((c) => c.priceCents);
        cents += Math.min(...prices);
        if (new Set(prices).size > 1) varies = true;
    }
    return { cents, varies };
}

/** Repeated names inside a list (orders find options by name), as `<prefix>.<i>.<field>` problems. */
export function duplicateNames(
    names: string[],
    path: (i: number) => string
): SetupProblem[] {
    const seen = new Set<string>();
    return names.flatMap((n, i) => {
        const key = n.trim().toLowerCase();
        const dup = seen.has(key);
        seen.add(key);
        return dup ? [{ path: path(i), error: { code: 'duplicate' as const } }] : [];
    });
}

/** Problems the field rules alone do not catch: one size group at most and no repeated names. */
export function optionsProblems(groups: OptionGroup[]): SetupProblem[] {
    const out = duplicateNames(
        groups.map((g) => g.name),
        (i) => `options.${i}.name`
    );
    let sizes = 0;
    groups.forEach((g, i) => {
        if (kindOf(g) === OptionGroupKind.SIZE && ++sizes > 1)
            out.push({ path: `options.${i}.name`, error: { code: 'one_per_product' } });
        out.push(
            ...duplicateNames(
                g.choices.map((c) => c.label),
                (j) => `options.${i}.choices.${j}.label`
            )
        );
    });
    return out;
}

/** The setup as stored: a size group is required and single; choices keep only their fields. */
export const normalizeOptions = (groups: OptionGroup[]): OptionGroup[] =>
    groups.map((g) => {
        const kind = kindOf(g);
        const size = kind === OptionGroupKind.SIZE;
        return {
            name: g.name,
            kind,
            required: size || g.required,
            multiple: size ? false : g.multiple,
            choices: g.choices.map((c) => ({ label: c.label, priceCents: c.priceCents }))
        };
    });
