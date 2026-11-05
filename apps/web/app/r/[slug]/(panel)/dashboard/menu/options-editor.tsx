'use client';

import type { OptionGroup } from '@elo/core/api/views/catalog.view';
import type { FieldError } from '@elo/core/fields/field-rules';
import {
    FLAVORS_DEFAULT,
    FlavorPricing,
    OptionGroupKind
} from '@elo/core/catalog/option-kinds';
import { kindOf, optionsProblems } from '@elo/core/catalog/product-pricing';
import { FIELD_RULES, fieldError, moneyError } from '@elo/core/fields/field-rules';
import { parseCents } from '@elo/core/money/cents';
import { Button } from '@elo/ui/components/forms/button';
import { Input, MoneyInput, Switch } from '@elo/ui/components/forms/fields';
import { Field } from '@elo/ui/components/layout/section';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { centsToInput } from '#/_lib/format';
import { OPTION_EDITOR_TEXTS as T } from '#/_lib/messages/catalog';
import { fieldMessage } from '#/_lib/messages/fields';

/** Choice being edited. `key` stays when the label changes, so flavor prices follow a renamed size. */
export interface DraftChoice {
    key: string;
    label: string;
    price: string;
    maxFlavors: string;
    /** Flavor prices by size key. */
    sizePrices: Record<string, string>;
}

/** Group being edited: prices stay as typed text until saving. */
export interface DraftGroup {
    kind: OptionGroupKind;
    name: string;
    required: boolean;
    multiple: boolean;
    flavorPricing: FlavorPricing;
    choices: DraftChoice[];
}

interface RowErrors {
    label?: FieldError;
    price?: FieldError;
    maxFlavors?: FieldError;
    /** By size key. */
    sizePrices?: Record<string, FieldError>;
}

/** Problems of one draft group: its name, "no choice at all", and each choice row by its draft position. */
export interface GroupErrors {
    name?: FieldError;
    choices?: FieldError;
    rows: RowErrors[];
}

const MAX_GROUPS = 20;
const MAX_CHOICES = 40;

let keySeq = 0;
const newKey = () => `c${++keySeq}`;

const priceText = (cents: number) => (cents ? centsToInput(cents) : '');

const blankChoice = (): DraftChoice => ({
    key: newKey(),
    label: '',
    price: '',
    maxFlavors: String(FLAVORS_DEFAULT),
    sizePrices: {}
});

export const toDraft = (groups: OptionGroup[]): DraftGroup[] => {
    const drafts = groups.map((g): DraftGroup => ({
        kind: kindOf(g),
        name: g.name,
        required: g.required,
        multiple: g.multiple,
        flavorPricing: g.flavorPricing ?? FlavorPricing.HIGHEST,
        choices: g.choices.map((c) => ({
            key: newKey(),
            label: c.label,
            price: priceText(c.priceCents),
            maxFlavors: String(c.maxFlavors ?? FLAVORS_DEFAULT),
            sizePrices: {}
        }))
    }));
    const sizes = drafts.find((g) => g.kind === OptionGroupKind.SIZE)?.choices ?? [];
    groups.forEach((g, i) => {
        if (kindOf(g) !== OptionGroupKind.FLAVOR) return;
        g.choices.forEach((c, j) => {
            for (const s of sizes) {
                const cents = c.sizePrices?.[s.label];
                if (cents !== undefined)
                    drafts[i].choices[j].sizePrices[s.key] = centsToInput(cents);
            }
        });
    });
    return drafts;
};

/** What is sent, with draft positions: fully blank groups and choices without a name are left out. */
function kept(drafts: DraftGroup[]) {
    return drafts.flatMap((g, i) => {
        const choices = g.choices.flatMap((c, j) => (c.label.trim() ? [{ c, j }] : []));
        return !g.name.trim() && !choices.length ? [] : [{ g, i, choices }];
    });
}

const sizeRows = (drafts: DraftGroup[]) =>
    kept(drafts)
        .find((k) => k.g.kind === OptionGroupKind.SIZE)
        ?.choices.map(({ c }) => c) ?? [];
const hasFlavors = (drafts: DraftGroup[]) =>
    drafts.some((g) => g.kind === OptionGroupKind.FLAVOR);

/** The product's price comes from its sizes. */
export const draftPricedBySize = (drafts: DraftGroup[]) =>
    drafts.some((g) => g.kind === OptionGroupKind.SIZE);

const blank = (drafts: DraftGroup[]): GroupErrors[] =>
    drafts.map((g) => ({ rows: g.choices.map(() => ({})) }));

const optionalPrice = (price: string) =>
    price.trim() ? moneyError(FIELD_RULES.priceCents, price) : null;
const requiredPrice = (price: string) => moneyError(FIELD_RULES.priceCents, price);
const intOf = (text: string) => (/^\s*\d+\s*$/.test(text) ? Number(text) : text);

/** The API body. Call only when `draftErrors` finds nothing. */
export const fromDraft = (drafts: DraftGroup[]): OptionGroup[] => {
    const sizes = sizeRows(drafts);
    const flavors = hasFlavors(drafts);
    return kept(drafts).map(({ g, choices }) => ({
        name: g.name.trim(),
        kind: g.kind,
        required: g.required,
        multiple: g.multiple,
        ...(g.kind === OptionGroupKind.FLAVOR ? { flavorPricing: g.flavorPricing } : {}),
        choices: choices.map(({ c }) => ({
            label: c.label.trim(),
            priceCents:
                g.kind === OptionGroupKind.FLAVOR ||
                (g.kind === OptionGroupKind.SIZE && flavors)
                    ? 0
                    : c.price.trim()
                      ? (parseCents(c.price) ?? 0)
                      : 0,
            ...(g.kind === OptionGroupKind.SIZE && flavors
                ? { maxFlavors: Number(intOf(c.maxFlavors)) || 0 }
                : {}),
            ...(g.kind === OptionGroupKind.FLAVOR
                ? {
                      sizePrices: Object.fromEntries(
                          sizes.flatMap((s) => {
                              const cents = parseCents(c.sizePrices[s.key] ?? '');
                              return cents === null ? [] : [[s.label.trim(), cents]];
                          })
                      )
                  }
                : {})
        }))
    }));
};

const SERVER_PATH =
    /^options\.(\d+)\.(name|choices)(?:\.(\d+)\.(label|priceCents|maxFlavors|sizePrices)(?:\.(.+))?)?$/;

/**
 * Errors on `options.N.…` paths moved to the draft rows they came from. Positions
 * count the sent list, which skips blank groups and choices; flavor prices are
 * keyed by size label there and by size key here.
 */
function place(
    drafts: DraftGroup[],
    out: GroupErrors[],
    fields: Record<string, FieldError>
): boolean {
    const sent = kept(drafts);
    const sizes = sizeRows(drafts);
    let landed = false;
    for (const [path, error] of Object.entries(fields)) {
        const m = SERVER_PATH.exec(path);
        const group = m && sent[Number(m[1])];
        if (!m || !group) continue;
        const target = out[group.i];
        if (m[2] === 'name') target.name ??= error;
        else if (m[3] === undefined) target.choices ??= error;
        else {
            const choice = group.choices[Number(m[3])];
            if (!choice) continue;
            const row = target.rows[choice.j];
            if (m[4] === 'label') row.label ??= error;
            else if (m[4] === 'maxFlavors') row.maxFlavors ??= error;
            else if (m[4] === 'sizePrices') {
                const size = sizes.find((s) => s.label.trim() === m[5]);
                if (!size) continue;
                row.sizePrices = { [size.key]: error, ...row.sizePrices };
            } else row.price ??= error;
        }
        landed = true;
    }
    return landed;
}

/** Each group's problems, checked with the same rules as the API. An extra without a value costs nothing. */
export function draftErrors(drafts: DraftGroup[]): GroupErrors[] {
    const out = blank(drafts);
    const sizes = sizeRows(drafts);
    const flavors = hasFlavors(drafts);
    for (const { g, i, choices } of kept(drafts)) {
        out[i].name = fieldError(FIELD_RULES.optionName, g.name) ?? undefined;
        if (!choices.length) out[i].choices = { code: 'too_few', params: { min: 1 } };
        for (const { c, j } of choices) {
            const row: RowErrors = {
                label: fieldError(FIELD_RULES.optionName, c.label) ?? undefined
            };
            if (g.kind === OptionGroupKind.EXTRA)
                row.price = optionalPrice(c.price) ?? undefined;
            if (g.kind === OptionGroupKind.SIZE && !flavors)
                row.price = requiredPrice(c.price) ?? undefined;
            if (g.kind === OptionGroupKind.SIZE && flavors)
                row.maxFlavors =
                    fieldError(FIELD_RULES.flavorsPerSize, intOf(c.maxFlavors)) ??
                    undefined;
            if (g.kind === OptionGroupKind.FLAVOR) {
                const bad = sizes.flatMap((s) => {
                    const e = requiredPrice(c.sizePrices[s.key] ?? '');
                    return e ? [[s.key, e] as const] : [];
                });
                if (bad.length) row.sizePrices = Object.fromEntries(bad);
            }
            out[i].rows[j] = row;
        }
    }
    // Rules about the setup as a whole (one size group, flavors need sizes, repeated names).
    const whole = optionsProblems(fromDraft(drafts)).filter(
        (p) => !p.path.includes('.sizePrices.') && !p.path.endsWith('.maxFlavors')
    );
    place(drafts, out, Object.fromEntries(whole.map((p) => [p.path, p.error])));
    return out;
}

/** Name of the first input with a problem (`options.0.choices.1.label`), to focus it; null when all is fine. */
export function firstInvalid(errors: GroupErrors[] | null): string | null {
    for (const [i, g] of (errors ?? []).entries()) {
        if (g.name) return `options.${i}.name`;
        if (g.choices) return `options.${i}.choices.0.label`;
        for (const [j, r] of g.rows.entries()) {
            const row = `options.${i}.choices.${j}`;
            if (r.label) return `${row}.label`;
            if (r.price) return `${row}.priceCents`;
            if (r.maxFlavors) return `${row}.maxFlavors`;
            const size = Object.keys(r.sizePrices ?? {})[0];
            if (size) return `${row}.sizePrices.${size}`;
        }
    }
    return null;
}

/** API errors on `options.N.…` under the draft inputs they belong to. */
export function draftErrorsFromServer(
    drafts: DraftGroup[],
    fields: Record<string, { code: string }>
): GroupErrors[] | null {
    const out = blank(drafts);
    return place(drafts, out, fields as Record<string, FieldError>) ? out : null;
}

const newGroup = (kind: OptionGroupKind): DraftGroup => ({
    kind,
    name:
        kind === OptionGroupKind.SIZE
            ? T.sizeName
            : kind === OptionGroupKind.FLAVOR
              ? T.flavorName
              : '',
    required: kind !== OptionGroupKind.EXTRA,
    multiple: kind === OptionGroupKind.FLAVOR,
    flavorPricing: FlavorPricing.HIGHEST,
    choices: [blankChoice()]
});

const choicesMessage = (e: FieldError) =>
    e.code === 'too_few' ? T.atLeastOneChoice : fieldMessage(e);

/**
 * Option groups editor: sizes (they set the price), flavors for half-and-half (a
 * price per size) and extras (they add to it). Shows each problem under its own
 * input once it was left, or all of them when `showAll`; `server` holds what the
 * API refused, until the next change.
 */
export function OptionsEditor({
    value,
    onChange,
    showAll,
    server
}: {
    value: DraftGroup[];
    onChange: (next: DraftGroup[]) => void;
    showAll: boolean;
    server: GroupErrors[] | null;
}) {
    const [touched, setTouched] = useState<Set<string>>(() => new Set());
    const touch = (name: string) =>
        setTouched((t) => (t.has(name) ? t : new Set(t).add(name)));
    const live = draftErrors(value);
    const shown = (name: string, own?: FieldError, fromServer?: FieldError) =>
        (showAll || touched.has(name) ? own : undefined) ?? fromServer;

    const sizeGroup = value.find((g) => g.kind === OptionGroupKind.SIZE);
    const sizes = (sizeGroup?.choices ?? []).filter((c) => c.label.trim());
    const flavors = hasFlavors(value);

    const patch = (i: number, g: Partial<DraftGroup>) =>
        onChange(value.map((x, k) => (k === i ? { ...x, ...g } : x)));
    const setChoice = (i: number, j: number, c: Partial<DraftChoice>) =>
        patch(i, {
            choices: value[i].choices.map((x, k) => (k === j ? { ...x, ...c } : x))
        });

    const kindHint = (kind: OptionGroupKind) =>
        kind === OptionGroupKind.SIZE
            ? flavors
                ? T.sizeHintFlavors
                : T.sizeHint
            : kind === OptionGroupKind.FLAVOR
              ? T.flavorHint
              : T.extraHint;

    return (
        <div className="space-y-4">
            {value.length === 0 && <p className="text-sm text-muted">{T.empty}</p>}
            {value.map((g, i) => {
                const nameKey = `options.${i}.name`;
                const nameError = shown(nameKey, live[i].name, server?.[i]?.name);
                const choicesError =
                    (showAll ||
                    g.choices.some((_, j) =>
                        touched.has(`options.${i}.choices.${j}.label`)
                    )
                        ? live[i].choices
                        : undefined) ?? server?.[i]?.choices;
                const showPrice =
                    g.kind === OptionGroupKind.EXTRA ||
                    (g.kind === OptionGroupKind.SIZE && !flavors);
                return (
                    <fieldset
                        key={i}
                        className="space-y-3 rounded-lg border border-line/60 p-4"
                    >
                        <div className="flex items-end gap-2">
                            <div className="min-w-0 flex-1">
                                <Field
                                    label={T.kindLabel[g.kind]}
                                    error={nameError && fieldMessage(nameError)}
                                >
                                    <Input
                                        name={nameKey}
                                        value={g.name}
                                        onChange={(e) =>
                                            patch(i, { name: e.target.value })
                                        }
                                        onBlur={() => touch(nameKey)}
                                        invalid={!!nameError}
                                        placeholder={T.groupPlaceholder[g.kind]}
                                        maxLength={FIELD_RULES.optionName.max}
                                    />
                                </Field>
                            </div>
                            <button
                                type="button"
                                aria-label={T.removeGroup}
                                onClick={() => onChange(value.filter((_, k) => k !== i))}
                                className="mb-1 grid shrink-0 h-10 w-10 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger"
                            >
                                <Trash2 size={17} />
                            </button>
                        </div>
                        <p className="text-xs text-muted">{kindHint(g.kind)}</p>

                        {g.kind === OptionGroupKind.EXTRA && (
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <label className="flex items-center gap-2.5">
                                    <Switch
                                        label={T.required}
                                        checked={g.required}
                                        onChange={(v) => patch(i, { required: v })}
                                    />{' '}
                                    {T.required}
                                </label>
                                <label className="flex items-center gap-2.5">
                                    <Switch
                                        label={T.multiple}
                                        checked={g.multiple}
                                        onChange={(v) => patch(i, { multiple: v })}
                                    />{' '}
                                    {T.multiple}
                                </label>
                            </div>
                        )}

                        {g.kind === OptionGroupKind.FLAVOR && (
                            <div
                                role="radiogroup"
                                aria-label={T.flavorPricingLabel}
                                className="flex flex-wrap gap-2"
                            >
                                {[FlavorPricing.HIGHEST, FlavorPricing.AVERAGE].map(
                                    (rule) => {
                                        const on = g.flavorPricing === rule;
                                        return (
                                            <button
                                                key={rule}
                                                type="button"
                                                role="radio"
                                                aria-checked={on}
                                                onClick={() =>
                                                    patch(i, { flavorPricing: rule })
                                                }
                                                className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium transition ${on ? 'border-brand bg-brand text-brand-fg' : 'border-line/70 hover:border-brand/60'}`}
                                            >
                                                {T.flavorPricing[rule]}
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        )}
                        {g.kind === OptionGroupKind.FLAVOR && !sizes.length && (
                            <p className="text-xs text-warning">{T.flavorNeedsSizes}</p>
                        )}

                        <ul className="space-y-3">
                            {g.choices.map((c, j) => {
                                const row = `options.${i}.choices.${j}`;
                                const labelKey = `${row}.label`;
                                const priceKey = `${row}.priceCents`;
                                const maxKey = `${row}.maxFlavors`;
                                const own = live[i].rows[j] ?? {};
                                const fromServer = server?.[i]?.rows[j] ?? {};
                                const labelError = shown(
                                    labelKey,
                                    own.label,
                                    fromServer.label
                                );
                                const priceError = shown(
                                    priceKey,
                                    own.price,
                                    fromServer.price
                                );
                                const maxError = shown(
                                    maxKey,
                                    own.maxFlavors,
                                    fromServer.maxFlavors
                                );
                                const sizeErrors = sizes.flatMap((s) => {
                                    const key = `${row}.sizePrices.${s.key}`;
                                    const e = shown(
                                        key,
                                        own.sizePrices?.[s.key],
                                        fromServer.sizePrices?.[s.key]
                                    );
                                    return e ? [{ size: s, e }] : [];
                                });
                                return (
                                    <li key={c.key}>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                name={labelKey}
                                                value={c.label}
                                                onChange={(e) =>
                                                    setChoice(i, j, {
                                                        label: e.target.value
                                                    })
                                                }
                                                onBlur={() => touch(labelKey)}
                                                invalid={!!labelError}
                                                placeholder={T.choicePlaceholder[g.kind]}
                                                aria-label={T.choiceName}
                                                maxLength={FIELD_RULES.optionName.max}
                                            />
                                            {showPrice && (
                                                <div className="w-32 shrink-0">
                                                    <MoneyInput
                                                        name={priceKey}
                                                        value={c.price}
                                                        onChange={(e) =>
                                                            setChoice(i, j, {
                                                                price: e.target.value
                                                            })
                                                        }
                                                        onBlur={() => touch(priceKey)}
                                                        invalid={!!priceError}
                                                        aria-label={T.priceLabel[g.kind]}
                                                    />
                                                </div>
                                            )}
                                            {g.kind === OptionGroupKind.SIZE &&
                                                flavors && (
                                                    <label className="flex w-28 shrink-0 items-center gap-2 text-xs text-muted">
                                                        <Input
                                                            name={maxKey}
                                                            value={c.maxFlavors}
                                                            inputMode="numeric"
                                                            onChange={(e) =>
                                                                setChoice(i, j, {
                                                                    maxFlavors:
                                                                        e.target.value
                                                                })
                                                            }
                                                            onBlur={() => touch(maxKey)}
                                                            invalid={!!maxError}
                                                            aria-label={T.maxFlavors}
                                                            className="text-center"
                                                        />
                                                        {T.flavorsShort}
                                                    </label>
                                                )}
                                            <button
                                                type="button"
                                                aria-label={T.removeChoice}
                                                disabled={g.choices.length === 1}
                                                onClick={() =>
                                                    patch(i, {
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
                                        {g.kind === OptionGroupKind.FLAVOR &&
                                            sizes.length > 0 && (
                                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                    {sizes.map((s) => {
                                                        const key = `${row}.sizePrices.${s.key}`;
                                                        return (
                                                            <label
                                                                key={s.key}
                                                                className="block"
                                                            >
                                                                <span className="mb-1 block truncate text-xs text-muted">
                                                                    {s.label}
                                                                </span>
                                                                <MoneyInput
                                                                    name={key}
                                                                    value={
                                                                        c.sizePrices[
                                                                            s.key
                                                                        ] ?? ''
                                                                    }
                                                                    onChange={(e) =>
                                                                        setChoice(i, j, {
                                                                            sizePrices: {
                                                                                ...c.sizePrices,
                                                                                [s.key]:
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                            }
                                                                        })
                                                                    }
                                                                    onBlur={() =>
                                                                        touch(key)
                                                                    }
                                                                    invalid={sizeErrors.some(
                                                                        (x) =>
                                                                            x.size.key ===
                                                                            s.key
                                                                    )}
                                                                    aria-label={T.flavorPriceAt(
                                                                        c.label ||
                                                                            T.flavorName,
                                                                        s.label
                                                                    )}
                                                                />
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        <span
                                            aria-live="polite"
                                            className="block text-xs text-danger"
                                        >
                                            {labelError && (
                                                <span className="mt-1 block">
                                                    {T.choiceName}:{' '}
                                                    {fieldMessage(labelError)}
                                                </span>
                                            )}
                                            {priceError && (
                                                <span className="mt-1 block">
                                                    {T.priceLabel[g.kind]}:{' '}
                                                    {fieldMessage(priceError)}
                                                </span>
                                            )}
                                            {maxError && (
                                                <span className="mt-1 block">
                                                    {T.maxFlavors}:{' '}
                                                    {fieldMessage(maxError)}
                                                </span>
                                            )}
                                            {sizeErrors.map(({ size, e }) => (
                                                <span
                                                    key={size.key}
                                                    className="mt-1 block"
                                                >
                                                    {size.label}: {fieldMessage(e)}
                                                </span>
                                            ))}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                        {choicesError && (
                            <p aria-live="polite" className="text-xs text-danger">
                                {choicesMessage(choicesError)}
                            </p>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={g.choices.length >= MAX_CHOICES}
                            onClick={() =>
                                patch(i, { choices: [...g.choices, blankChoice()] })
                            }
                        >
                            <Plus size={16} /> {T.addChoice[g.kind]}
                        </Button>
                    </fieldset>
                );
            })}
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="soft"
                    disabled={value.length >= MAX_GROUPS || !!sizeGroup}
                    onClick={() => onChange([newGroup(OptionGroupKind.SIZE), ...value])}
                >
                    <Plus size={16} /> {T.addGroup[OptionGroupKind.SIZE]}
                </Button>
                <Button
                    type="button"
                    variant="soft"
                    disabled={value.length >= MAX_GROUPS || !sizeGroup || flavors}
                    title={sizeGroup ? undefined : T.flavorNeedsSizes}
                    onClick={() => {
                        const at = value.indexOf(sizeGroup!) + 1;
                        onChange([
                            ...value.slice(0, at),
                            newGroup(OptionGroupKind.FLAVOR),
                            ...value.slice(at)
                        ]);
                    }}
                >
                    <Plus size={16} /> {T.addGroup[OptionGroupKind.FLAVOR]}
                </Button>
                <Button
                    type="button"
                    variant="soft"
                    disabled={value.length >= MAX_GROUPS}
                    onClick={() => onChange([...value, newGroup(OptionGroupKind.EXTRA)])}
                >
                    <Plus size={16} /> {T.addGroup[OptionGroupKind.EXTRA]}
                </Button>
            </div>
        </div>
    );
}
