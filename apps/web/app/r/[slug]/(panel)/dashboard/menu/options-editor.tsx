'use client';

import type { OptionGroup } from '@elo/core/api/views/catalog.view';
import type { ProductGroupKind } from '@elo/core/catalog/option-kinds';
import type { FieldError } from '@elo/core/fields/field-rules';
import { OptionGroupKind } from '@elo/core/catalog/option-kinds';
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

/** Group being edited: prices stay as typed text until saving. */
export interface DraftGroup {
    kind: ProductGroupKind;
    name: string;
    required: boolean;
    multiple: boolean;
    choices: { label: string; price: string }[];
}

/** Problems of one draft group: its name, "no choice at all", and each choice row by its draft position. */
export interface GroupErrors {
    name?: FieldError;
    choices?: FieldError;
    rows: { label?: FieldError; price?: FieldError }[];
}

const MAX_GROUPS = 20;
const MAX_CHOICES = 40;

const priceText = (cents: number) => (cents ? centsToInput(cents) : '');

export const toDraft = (groups: OptionGroup[]): DraftGroup[] =>
    groups.map((g) => ({
        kind: kindOf(g),
        name: g.name,
        required: g.required,
        multiple: g.multiple,
        choices: g.choices.map((c) => ({
            label: c.label,
            price: priceText(c.priceCents)
        }))
    }));

/** What is sent, with draft positions: fully blank groups and choices without a name are left out. */
function kept(drafts: DraftGroup[]) {
    return drafts.flatMap((g, i) => {
        const choices = g.choices.flatMap((c, j) => (c.label.trim() ? [{ c, j }] : []));
        return !g.name.trim() && !choices.length ? [] : [{ g, i, choices }];
    });
}

/** The product's price comes from its sizes. */
export const draftPricedBySize = (drafts: DraftGroup[]) =>
    drafts.some((g) => g.kind === OptionGroupKind.SIZE);

const blank = (drafts: DraftGroup[]): GroupErrors[] =>
    drafts.map((g) => ({ rows: g.choices.map(() => ({})) }));

/** The API body. Call only when `draftErrors` finds nothing. */
export const fromDraft = (drafts: DraftGroup[]): OptionGroup[] =>
    kept(drafts).map(({ g, choices }) => ({
        name: g.name.trim(),
        kind: g.kind,
        required: g.required,
        multiple: g.multiple,
        choices: choices.map(({ c }) => ({
            label: c.label.trim(),
            priceCents: c.price.trim() ? (parseCents(c.price) ?? 0) : 0
        }))
    }));

const SERVER_PATH = /^options\.(\d+)\.(name|choices)(?:\.(\d+)\.(label|priceCents))?$/;

/** Errors on `options.N.…` paths moved to the draft rows they came from (positions count the sent list). */
function place(
    drafts: DraftGroup[],
    out: GroupErrors[],
    fields: Record<string, FieldError>
): boolean {
    const sent = kept(drafts);
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
            else row.price ??= error;
        }
        landed = true;
    }
    return landed;
}

/** Each group's problems, checked with the same rules as the API. An extra without a value costs nothing. */
export function draftErrors(drafts: DraftGroup[]): GroupErrors[] {
    const out = blank(drafts);
    for (const { g, i, choices } of kept(drafts)) {
        out[i].name = fieldError(FIELD_RULES.optionName, g.name) ?? undefined;
        if (!choices.length) out[i].choices = { code: 'too_few', params: { min: 1 } };
        for (const { c, j } of choices)
            out[i].rows[j] = {
                label: fieldError(FIELD_RULES.optionName, c.label) ?? undefined,
                price:
                    (g.kind === OptionGroupKind.SIZE || c.price.trim()
                        ? moneyError(FIELD_RULES.priceCents, c.price)
                        : null) ?? undefined
            };
    }
    const whole = optionsProblems(fromDraft(drafts));
    place(drafts, out, Object.fromEntries(whole.map((p) => [p.path, p.error])));
    return out;
}

/** Name of the first input with a problem (`options.0.choices.1.label`), to focus it; null when all is fine. */
export function firstInvalid(errors: GroupErrors[] | null): string | null {
    for (const [i, g] of (errors ?? []).entries()) {
        if (g.name) return `options.${i}.name`;
        if (g.choices) return `options.${i}.choices.0.label`;
        for (const [j, r] of g.rows.entries()) {
            if (r.label) return `options.${i}.choices.${j}.label`;
            if (r.price) return `options.${i}.choices.${j}.priceCents`;
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

const newGroup = (kind: ProductGroupKind): DraftGroup => ({
    kind,
    name: kind === OptionGroupKind.SIZE ? T.sizeName : '',
    required: kind === OptionGroupKind.SIZE,
    multiple: false,
    choices: [{ label: '', price: '' }]
});

const choicesMessage = (e: FieldError) =>
    e.code === 'too_few' ? T.atLeastOneChoice : fieldMessage(e);

/**
 * Option groups editor: sizes (they set the price) and extras (they add to it).
 * Shows each problem under its own input once it was left, or all of them when
 * `showAll`; `server` holds what the API refused, until the next change.
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
    const hasSizes = draftPricedBySize(value);

    const patch = (i: number, g: Partial<DraftGroup>) =>
        onChange(value.map((x, k) => (k === i ? { ...x, ...g } : x)));
    const setChoice = (i: number, j: number, c: Partial<DraftGroup['choices'][number]>) =>
        patch(i, {
            choices: value[i].choices.map((x, k) => (k === j ? { ...x, ...c } : x))
        });

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
                        <p className="text-xs text-muted">{T.kindHint[g.kind]}</p>
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
                        <ul className="space-y-2">
                            {g.choices.map((c, j) => {
                                const labelKey = `options.${i}.choices.${j}.label`;
                                const priceKey = `options.${i}.choices.${j}.priceCents`;
                                const labelError = shown(
                                    labelKey,
                                    live[i].rows[j]?.label,
                                    server?.[i]?.rows[j]?.label
                                );
                                const priceError = shown(
                                    priceKey,
                                    live[i].rows[j]?.price,
                                    server?.[i]?.rows[j]?.price
                                );
                                return (
                                    <li key={j}>
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
                                patch(i, {
                                    choices: [...g.choices, { label: '', price: '' }]
                                })
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
                    disabled={value.length >= MAX_GROUPS || hasSizes}
                    onClick={() => onChange([newGroup(OptionGroupKind.SIZE), ...value])}
                >
                    <Plus size={16} /> {T.addGroup[OptionGroupKind.SIZE]}
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
