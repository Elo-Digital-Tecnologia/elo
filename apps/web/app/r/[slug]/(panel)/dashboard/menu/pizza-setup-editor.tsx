'use client';

import type { PizzaSetup } from '@elo/core/api/views/catalog.view';
import type { FieldError } from '@elo/core/fields/field-rules';
import { FLAVORS_DEFAULT, FlavorPricing } from '@elo/core/catalog/option-kinds';
import { pizzaSetupProblems } from '@elo/core/catalog/pizza-pricing';
import { FIELD_RULES, fieldError, moneyError } from '@elo/core/fields/field-rules';
import { parseCents } from '@elo/core/money/cents';
import { Button } from '@elo/ui/components/forms/button';
import { Input, MoneyInput, Switch } from '@elo/ui/components/forms/fields';
import { Field } from '@elo/ui/components/layout/section';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { centsToInput } from '#/_lib/format';
import { OPTION_EDITOR_TEXTS, PIZZA_TEXTS as T } from '#/_lib/messages/catalog';
import { fieldMessage } from '#/_lib/messages/fields';
import { newUuid } from '#/_lib/uuid';

/** Pizza setup being edited: numbers and prices stay as typed text until saving. */
export interface PizzaDraft {
    sizesName: string;
    flavorsName: string;
    flavorPricing: FlavorPricing;
    sizes: { id: string; label: string; maxFlavors: string }[];
    addons: {
        name: string;
        required: boolean;
        multiple: boolean;
        choices: { label: string; prices: Record<string, string> }[];
    }[];
}

/** Problems by input name (`pizza.sizes.0.label`, `pizza.addons.0.choices.1.sizePrices.<size id>`). */
export type PizzaErrors = Record<string, FieldError>;

const MAX_SIZES = 10;
const MAX_GROUPS = 20;
const MAX_CHOICES = 40;

const newSize = () => ({
    id: newUuid(),
    label: '',
    maxFlavors: String(FLAVORS_DEFAULT)
});
const newChoice = () => ({ label: '', prices: {} as Record<string, string> });

export const toPizzaDraft = (setup: PizzaSetup | null): PizzaDraft =>
    setup
        ? {
              sizesName: setup.sizesName,
              flavorsName: setup.flavorsName,
              flavorPricing: setup.flavorPricing,
              sizes: setup.sizes.map((s) => ({
                  id: s.id,
                  label: s.label,
                  maxFlavors: String(s.maxFlavors)
              })),
              addons: setup.addons.map((g) => ({
                  name: g.name,
                  required: g.required,
                  multiple: g.multiple,
                  choices: g.choices.map((c) => ({
                      label: c.label,
                      prices: Object.fromEntries(
                          Object.entries(c.sizePrices).map(([id, cents]) => [
                              id,
                              centsToInput(cents)
                          ])
                      )
                  }))
              }))
          }
        : {
              sizesName: T.defaultSizesName,
              flavorsName: T.defaultFlavorsName,
              flavorPricing: FlavorPricing.AVERAGE,
              sizes: [newSize()],
              addons: []
          };

const intOf = (text: string) => (/^\s*\d+\s*$/.test(text) ? Number(text) : text);

/** The API body. Call only when `pizzaDraftErrors` finds nothing. */
export const fromPizzaDraft = (d: PizzaDraft): PizzaSetup => ({
    sizesName: d.sizesName.trim(),
    flavorsName: d.flavorsName.trim(),
    flavorPricing: d.flavorPricing,
    sizes: d.sizes.map((s) => ({
        id: s.id,
        label: s.label.trim(),
        maxFlavors: Number(intOf(s.maxFlavors)) || 0
    })),
    addons: d.addons.map((g) => ({
        name: g.name.trim(),
        required: g.required,
        multiple: g.multiple,
        choices: g.choices.map((c) => ({
            label: c.label.trim(),
            sizePrices: Object.fromEntries(
                d.sizes.flatMap((s) => {
                    const cents = parseCents(c.prices[s.id] ?? '');
                    return cents === null ? [] : [[s.id, cents]];
                })
            )
        }))
    }))
});

/** Each input's problem, checked with the same rules as the API. */
export function pizzaDraftErrors(d: PizzaDraft): PizzaErrors {
    const out: PizzaErrors = {};
    const add = (path: string, e: FieldError | null) => {
        if (e && !out[path]) out[path] = e;
    };
    add('pizza.sizesName', fieldError(FIELD_RULES.optionName, d.sizesName));
    add('pizza.flavorsName', fieldError(FIELD_RULES.optionName, d.flavorsName));
    d.sizes.forEach((s, i) => {
        add(`pizza.sizes.${i}.label`, fieldError(FIELD_RULES.optionName, s.label));
        add(
            `pizza.sizes.${i}.maxFlavors`,
            fieldError(FIELD_RULES.flavorsPerSize, intOf(s.maxFlavors))
        );
    });
    d.addons.forEach((g, i) => {
        add(`pizza.addons.${i}.name`, fieldError(FIELD_RULES.optionName, g.name));
        g.choices.forEach((c, j) => {
            const row = `pizza.addons.${i}.choices.${j}`;
            add(`${row}.label`, fieldError(FIELD_RULES.optionName, c.label));
            for (const s of d.sizes)
                add(
                    `${row}.sizePrices.${s.id}`,
                    moneyError(FIELD_RULES.priceCents, c.prices[s.id] ?? '')
                );
        });
    });
    for (const p of pizzaSetupProblems(fromPizzaDraft(d))) add(p.path, p.error);
    return out;
}

/** Name of the first input with a problem, to focus it; null when all is fine. */
export const firstPizzaInvalid = (errors: PizzaErrors) => Object.keys(errors)[0] ?? null;

/**
 * Setup of a pizza category: sizes with their flavor limit, how half-and-half is
 * charged and the add-ons (border, dough) priced per size, all shared by its flavors.
 */
export function PizzaSetupEditor({
    value,
    onChange,
    showAll,
    server
}: {
    value: PizzaDraft;
    onChange: (next: PizzaDraft) => void;
    showAll: boolean;
    server: PizzaErrors | null;
}) {
    const [touched, setTouched] = useState<Set<string>>(() => new Set());
    const touch = (name: string) =>
        setTouched((t) => (t.has(name) ? t : new Set(t).add(name)));
    const live = pizzaDraftErrors(value);
    const shown = (name: string) =>
        (showAll || touched.has(name) ? live[name] : undefined) ?? server?.[name];
    const message = (name: string) => {
        const e = shown(name);
        return e ? fieldMessage(e) : undefined;
    };

    const set = (patch: Partial<PizzaDraft>) => onChange({ ...value, ...patch });
    const setSize = (i: number, patch: Partial<PizzaDraft['sizes'][number]>) =>
        set({ sizes: value.sizes.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
    const setAddon = (i: number, patch: Partial<PizzaDraft['addons'][number]>) =>
        set({ addons: value.addons.map((g, k) => (k === i ? { ...g, ...patch } : g)) });
    const setChoice = (
        i: number,
        j: number,
        patch: Partial<PizzaDraft['addons'][number]['choices'][number]>
    ) =>
        setAddon(i, {
            choices: value.addons[i].choices.map((c, k) =>
                k === j ? { ...c, ...patch } : c
            )
        });

    const text = (name: string, val: string, onText: (v: string) => void, extra = {}) => (
        <Input
            name={name}
            value={val}
            onChange={(e) => onText(e.target.value)}
            onBlur={() => touch(name)}
            invalid={!!shown(name)}
            maxLength={FIELD_RULES.optionName.max}
            {...extra}
        />
    );

    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={T.sizesName} error={message('pizza.sizesName')}>
                    {text('pizza.sizesName', value.sizesName, (v) =>
                        set({ sizesName: v })
                    )}
                </Field>
                <Field label={T.flavorsName} error={message('pizza.flavorsName')}>
                    {text('pizza.flavorsName', value.flavorsName, (v) =>
                        set({ flavorsName: v })
                    )}
                </Field>
            </div>

            <fieldset className="space-y-3 rounded-lg border border-line/60 p-4">
                <legend className="px-1 text-sm font-semibold">{T.sizes}</legend>
                <p className="text-xs text-muted">{T.sizesHint}</p>
                <ul className="space-y-2">
                    {value.sizes.map((s, i) => {
                        const labelKey = `pizza.sizes.${i}.label`;
                        const maxKey = `pizza.sizes.${i}.maxFlavors`;
                        return (
                            <li key={s.id}>
                                <div className="flex items-center gap-2">
                                    {text(
                                        labelKey,
                                        s.label,
                                        (v) => setSize(i, { label: v }),
                                        {
                                            'placeholder': T.sizePlaceholder,
                                            'aria-label': T.sizeLabel
                                        }
                                    )}
                                    <label className="flex w-32 shrink-0 items-center gap-2 text-xs text-muted">
                                        <Input
                                            name={maxKey}
                                            value={s.maxFlavors}
                                            inputMode="numeric"
                                            onChange={(e) =>
                                                setSize(i, { maxFlavors: e.target.value })
                                            }
                                            onBlur={() => touch(maxKey)}
                                            invalid={!!shown(maxKey)}
                                            aria-label={T.maxFlavors}
                                            className="text-center"
                                        />
                                        {T.flavorsShort}
                                    </label>
                                    <button
                                        type="button"
                                        aria-label={T.removeSize}
                                        disabled={value.sizes.length === 1}
                                        onClick={() =>
                                            set({
                                                sizes: value.sizes.filter(
                                                    (_, k) => k !== i
                                                )
                                            })
                                        }
                                        className="grid h-10 w-10 shrink-0 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <span
                                    aria-live="polite"
                                    className="block text-xs text-danger"
                                >
                                    {message(labelKey) && (
                                        <span className="mt-1 block">
                                            {T.sizeLabel}: {message(labelKey)}
                                        </span>
                                    )}
                                    {message(maxKey) && (
                                        <span className="mt-1 block">
                                            {T.maxFlavors}: {message(maxKey)}
                                        </span>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ul>
                {message('pizza.sizes') && (
                    <p aria-live="polite" className="text-xs text-danger">
                        {message('pizza.sizes')}
                    </p>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    disabled={value.sizes.length >= MAX_SIZES}
                    onClick={() => set({ sizes: [...value.sizes, newSize()] })}
                >
                    <Plus size={16} /> {T.addSize}
                </Button>
            </fieldset>

            <div role="radiogroup" aria-label={T.pricingLabel} className="space-y-2">
                <p className="text-sm font-medium">{T.pricingLabel}</p>
                <div className="flex flex-wrap gap-2">
                    {[FlavorPricing.AVERAGE, FlavorPricing.HIGHEST].map((rule) => {
                        const on = value.flavorPricing === rule;
                        return (
                            <button
                                key={rule}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => set({ flavorPricing: rule })}
                                className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium transition ${on ? 'border-brand bg-brand text-brand-fg' : 'border-line/70 hover:border-brand/60'}`}
                            >
                                {T.pricing[rule]}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <p className="text-sm font-semibold">{T.addons}</p>
                    <p className="text-xs text-muted">{T.addonsHint}</p>
                </div>
                {value.addons.map((g, i) => {
                    const nameKey = `pizza.addons.${i}.name`;
                    return (
                        <fieldset
                            key={i}
                            className="space-y-3 rounded-lg border border-line/60 p-4"
                        >
                            <div className="flex items-end gap-2">
                                <div className="min-w-0 flex-1">
                                    <Field label={T.addonName} error={message(nameKey)}>
                                        {text(
                                            nameKey,
                                            g.name,
                                            (v) => setAddon(i, { name: v }),
                                            {
                                                placeholder: T.addonPlaceholder
                                            }
                                        )}
                                    </Field>
                                </div>
                                <button
                                    type="button"
                                    aria-label={T.removeAddon}
                                    onClick={() =>
                                        set({
                                            addons: value.addons.filter((_, k) => k !== i)
                                        })
                                    }
                                    className="mb-1 grid shrink-0 h-10 w-10 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger"
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <label className="flex items-center gap-2.5">
                                    <Switch
                                        label={OPTION_EDITOR_TEXTS.required}
                                        checked={g.required}
                                        onChange={(v) => setAddon(i, { required: v })}
                                    />{' '}
                                    {OPTION_EDITOR_TEXTS.required}
                                </label>
                                <label className="flex items-center gap-2.5">
                                    <Switch
                                        label={OPTION_EDITOR_TEXTS.multiple}
                                        checked={g.multiple}
                                        onChange={(v) => setAddon(i, { multiple: v })}
                                    />{' '}
                                    {OPTION_EDITOR_TEXTS.multiple}
                                </label>
                            </div>
                            <ul className="space-y-3">
                                {g.choices.map((c, j) => {
                                    const row = `pizza.addons.${i}.choices.${j}`;
                                    const labelKey = `${row}.label`;
                                    const priceErrors = value.sizes.flatMap((s) => {
                                        const m = message(`${row}.sizePrices.${s.id}`);
                                        return m ? [{ s, m }] : [];
                                    });
                                    return (
                                        <li key={j}>
                                            <div className="flex items-center gap-2">
                                                {text(
                                                    labelKey,
                                                    c.label,
                                                    (v) => setChoice(i, j, { label: v }),
                                                    {
                                                        'placeholder':
                                                            T.choicePlaceholder,
                                                        'aria-label':
                                                            OPTION_EDITOR_TEXTS.choiceName
                                                    }
                                                )}
                                                <button
                                                    type="button"
                                                    aria-label={
                                                        OPTION_EDITOR_TEXTS.removeChoice
                                                    }
                                                    disabled={g.choices.length === 1}
                                                    onClick={() =>
                                                        setAddon(i, {
                                                            choices: g.choices.filter(
                                                                (_, k) => k !== j
                                                            )
                                                        })
                                                    }
                                                    className="grid h-10 w-10 shrink-0 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {value.sizes.map((s) => {
                                                    const key = `${row}.sizePrices.${s.id}`;
                                                    return (
                                                        <label
                                                            key={s.id}
                                                            className="block"
                                                        >
                                                            <span className="mb-1 block truncate text-xs text-muted">
                                                                {s.label || '—'}
                                                            </span>
                                                            <MoneyInput
                                                                name={key}
                                                                value={
                                                                    c.prices[s.id] ?? ''
                                                                }
                                                                onChange={(e) =>
                                                                    setChoice(i, j, {
                                                                        prices: {
                                                                            ...c.prices,
                                                                            [s.id]:
                                                                                e.target
                                                                                    .value
                                                                        }
                                                                    })
                                                                }
                                                                onBlur={() => touch(key)}
                                                                invalid={!!shown(key)}
                                                                aria-label={T.priceAt(
                                                                    c.label ||
                                                                        T.choicePlaceholder,
                                                                    s.label
                                                                )}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            <span
                                                aria-live="polite"
                                                className="block text-xs text-danger"
                                            >
                                                {message(labelKey) && (
                                                    <span className="mt-1 block">
                                                        {OPTION_EDITOR_TEXTS.choiceName}:{' '}
                                                        {message(labelKey)}
                                                    </span>
                                                )}
                                                {priceErrors.map(({ s, m }) => (
                                                    <span
                                                        key={s.id}
                                                        className="mt-1 block"
                                                    >
                                                        {s.label}: {m}
                                                    </span>
                                                ))}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={g.choices.length >= MAX_CHOICES}
                                onClick={() =>
                                    setAddon(i, { choices: [...g.choices, newChoice()] })
                                }
                            >
                                <Plus size={16} /> {T.addChoice}
                            </Button>
                        </fieldset>
                    );
                })}
                <Button
                    type="button"
                    variant="soft"
                    disabled={value.addons.length >= MAX_GROUPS}
                    onClick={() =>
                        set({
                            addons: [
                                ...value.addons,
                                {
                                    name: '',
                                    required: false,
                                    multiple: false,
                                    choices: [newChoice()]
                                }
                            ]
                        })
                    }
                >
                    <Plus size={16} /> {T.addAddon}
                </Button>
            </div>
        </div>
    );
}
