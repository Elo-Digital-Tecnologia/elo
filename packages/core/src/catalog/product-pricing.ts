import type { OptionChoice, OptionGroup } from '../api/views/catalog.view.js';
import type { FieldError } from '../fields/field-rules.js';
import { FIELD_RULES, fieldError } from '../fields/field-rules.js';
import { FLAVORS_DEFAULT, FlavorPricing, OptionGroupKind } from './option-kinds.js';

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

/** A problem in an option setup, at the path the product form uses (`options.0.choices.1.label`). */
export interface OptionProblem {
    path: string;
    error: FieldError;
}

export const kindOf = (g: OptionGroup): OptionGroupKind =>
    g.kind ?? OptionGroupKind.EXTRA;

export const sizeGroupOf = (groups: OptionGroup[]) =>
    groups.find((g) => kindOf(g) === OptionGroupKind.SIZE);

export const flavorGroupOf = (groups: OptionGroup[]) =>
    groups.find((g) => kindOf(g) === OptionGroupKind.FLAVOR);

/** The size decides the price, so the product has no price of its own. */
export const pricedBySize = (groups: OptionGroup[]) => !!sizeGroupOf(groups);

export const maxFlavorsOf = (size: OptionChoice) => size.maxFlavors ?? FLAVORS_DEFAULT;

/** Flavor price at a size; null when the flavor has none for it. */
export const flavorPriceAt = (flavor: OptionChoice, size: string): number | null =>
    flavor.sizePrices?.[size] ?? null;

/** Price of several flavors in one item. The average rounds up to the cent. */
export function combineFlavors(
    prices: number[],
    rule: FlavorPricing | undefined
): number {
    if (!prices.length) return 0;
    if (rule === FlavorPricing.AVERAGE)
        return Math.ceil(prices.reduce((s, p) => s + p, 0) / prices.length);
    return Math.max(...prices);
}

/** Order in which a guest fills the groups: size, then flavors, then the rest. */
const KIND_ORDER: Record<OptionGroupKind, number> = {
    [OptionGroupKind.SIZE]: 0,
    [OptionGroupKind.FLAVOR]: 1,
    [OptionGroupKind.EXTRA]: 2
};

export const groupsInFillOrder = (groups: OptionGroup[]) =>
    [...groups].sort((a, b) => KIND_ORDER[kindOf(a)] - KIND_ORDER[kindOf(b)]);

/**
 * Checks a guest's choices against the product and prices one unit. The API trusts
 * only this result; the menu uses the same function to show the price as it changes.
 */
export function priceSelection(
    product: PricedProduct,
    chosen: ChosenOption[]
): PricingResult {
    const fail = (problem: PricingProblem): PricingResult => ({ ok: false, problem });
    const seen = new Set<string>();
    const picked: { group: OptionGroup; choice: OptionChoice }[] = [];

    for (const { group, label } of chosen) {
        const def = product.options.find((g) => g.name === group);
        const choice = def?.choices.find((c) => c.label === label);
        if (!def || !choice) return fail(PricingProblem.INVALID_OPTION);
        const key = `${group}\u0000${label}`;
        if (seen.has(key)) return fail(PricingProblem.DUPLICATE_OPTION);
        seen.add(key);
        picked.push({ group: def, choice });
    }

    const sizeGroup = sizeGroupOf(product.options);
    const flavorGroup = flavorGroupOf(product.options);
    const size = picked.find((p) => p.group === sizeGroup)?.choice;
    const flavors = picked.filter((p) => p.group === flavorGroup).map((p) => p.choice);

    for (const def of product.options) {
        const kind = kindOf(def);
        const count = picked.filter((p) => p.group === def).length;
        const required = def.required || kind !== OptionGroupKind.EXTRA;
        if (required && count === 0) return fail(PricingProblem.MISSING_REQUIRED);
        // Without a size the size group itself reports the missing choice.
        const max =
            kind === OptionGroupKind.FLAVOR
                ? size
                    ? maxFlavorsOf(size)
                    : Infinity
                : kind === OptionGroupKind.SIZE || !def.multiple
                  ? 1
                  : Infinity;
        if (count > max) return fail(PricingProblem.TOO_MANY);
    }

    const flavorPrices: number[] = [];
    if (flavorGroup && size)
        for (const f of flavors) {
            const price = flavorPriceAt(f, size.label);
            if (price === null) return fail(PricingProblem.INVALID_OPTION);
            flavorPrices.push(price);
        }

    const base = !sizeGroup
        ? product.priceCents
        : flavorGroup
          ? combineFlavors(flavorPrices, flavorGroup.flavorPricing)
          : (size?.priceCents ?? 0);

    const options: PricedOption[] = picked.map(({ group, choice }) => {
        const kind = kindOf(group);
        const priceCents =
            kind === OptionGroupKind.FLAVOR
                ? (flavorPriceAt(choice, size?.label ?? '') ?? 0)
                : kind === OptionGroupKind.SIZE && flavorGroup
                  ? 0
                  : choice.priceCents;
        return { group: group.name, label: choice.label, priceCents, kind };
    });
    const extras = options
        .filter((o) => o.kind === OptionGroupKind.EXTRA)
        .reduce((s, o) => s + o.priceCents, 0);

    return { ok: true, unitCents: base + extras, options };
}

/** Cheapest price the guest can reach, and whether the price changes with the choices ("from R$ X"). */
export function startingPrice(product: PricedProduct): {
    cents: number;
    varies: boolean;
} {
    const sizeGroup = sizeGroupOf(product.options);
    const flavorGroup = flavorGroupOf(product.options);
    let bases: number[];
    if (!sizeGroup) bases = [product.priceCents];
    else if (!flavorGroup) bases = sizeGroup.choices.map((c) => c.priceCents);
    else
        bases = sizeGroup.choices.flatMap((s) =>
            flavorGroup.choices.flatMap((f) => {
                const p = flavorPriceAt(f, s.label);
                return p === null ? [] : [p];
            })
        );
    if (!bases.length) bases = [0];

    let cents = Math.min(...bases);
    let varies = new Set(bases).size > 1;
    for (const g of product.options) {
        if (kindOf(g) !== OptionGroupKind.EXTRA || !g.required || !g.choices.length)
            continue;
        const prices = g.choices.map((c) => c.priceCents);
        cents += Math.min(...prices);
        if (new Set(prices).size > 1) varies = true;
    }
    return { cents, varies };
}

/**
 * Problems in an option setup that the field rules alone do not catch: one size and
 * one flavor group at most, flavors only next to sizes, a price for every flavor at
 * every size, and no repeated names (orders find options by name).
 */
export function optionsProblems(groups: OptionGroup[]): OptionProblem[] {
    const out: OptionProblem[] = [];
    const add = (path: string, error: FieldError | null) => {
        if (error) out.push({ path, error });
    };
    const sizeGroup = sizeGroupOf(groups);
    const sizeLabels = sizeGroup?.choices.map((c) => c.label.trim()) ?? [];
    const kinds = new Set<OptionGroupKind>();
    const names = new Set<string>();

    groups.forEach((g, i) => {
        const at = `options.${i}`;
        const kind = kindOf(g);
        if (kind !== OptionGroupKind.EXTRA && kinds.has(kind))
            add(`${at}.name`, { code: 'one_per_product' });
        kinds.add(kind);
        if (kind === OptionGroupKind.FLAVOR && !sizeGroup)
            add(`${at}.name`, { code: 'needs_size' });
        const name = g.name.trim().toLowerCase();
        if (names.has(name)) add(`${at}.name`, { code: 'duplicate' });
        names.add(name);

        const labels = new Set<string>();
        g.choices.forEach((c, j) => {
            const row = `${at}.choices.${j}`;
            const label = c.label.trim().toLowerCase();
            if (labels.has(label)) add(`${row}.label`, { code: 'duplicate' });
            labels.add(label);
            if (kind === OptionGroupKind.SIZE && flavorGroupOf(groups))
                add(
                    `${row}.maxFlavors`,
                    fieldError(FIELD_RULES.flavorsPerSize, maxFlavorsOf(c))
                );
            if (kind === OptionGroupKind.FLAVOR)
                for (const size of sizeLabels)
                    add(
                        `${row}.sizePrices.${size}`,
                        fieldError(FIELD_RULES.priceCents, c.sizePrices?.[size])
                    );
        });
    });
    return out;
}

/**
 * The setup as stored: sizes and flavors are always required, one size and many
 * flavors; each choice keeps only the fields its kind uses.
 */
export function normalizeOptions(groups: OptionGroup[]): OptionGroup[] {
    const withFlavors = !!flavorGroupOf(groups);
    const sizeLabels = new Set(sizeGroupOf(groups)?.choices.map((c) => c.label) ?? []);
    return groups.map((g) => {
        const kind = kindOf(g);
        if (kind === OptionGroupKind.SIZE)
            return {
                name: g.name,
                kind,
                required: true,
                multiple: false,
                choices: g.choices.map((c) => ({
                    label: c.label,
                    priceCents: withFlavors ? 0 : c.priceCents,
                    ...(withFlavors ? { maxFlavors: maxFlavorsOf(c) } : {})
                }))
            };
        if (kind === OptionGroupKind.FLAVOR)
            return {
                name: g.name,
                kind,
                required: true,
                multiple: true,
                flavorPricing: g.flavorPricing ?? FlavorPricing.HIGHEST,
                choices: g.choices.map((c) => ({
                    label: c.label,
                    priceCents: 0,
                    sizePrices: Object.fromEntries(
                        Object.entries(c.sizePrices ?? {}).filter(([s]) =>
                            sizeLabels.has(s)
                        )
                    )
                }))
            };
        return {
            name: g.name,
            kind: OptionGroupKind.EXTRA,
            required: g.required,
            multiple: g.multiple,
            choices: g.choices.map((c) => ({ label: c.label, priceCents: c.priceCents }))
        };
    });
}
