'use client';

import { CATALOG_TEXTS } from '../_lib/messages/catalog';

export interface ChoiceRow {
    label: string;
    /** Shown at the end of the row ("R$ 40,00", "+ R$ 5,00"). */
    price?: string | null;
    disabled?: boolean;
}

/** One group of choices in an item sheet: radios when one is taken, checkboxes when many. */
export function ChoiceGroup({
    name,
    required,
    many,
    note,
    rows,
    isOn,
    onPick
}: {
    name: string;
    required: boolean;
    many: boolean;
    note?: string | null;
    rows: ChoiceRow[];
    isOn: (label: string) => boolean;
    onPick: (label: string) => void;
}) {
    return (
        <fieldset>
            <legend className="mb-2 flex w-full items-center justify-between gap-3">
                <span className="font-semibold">{name}</span>
                <span
                    className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${required ? 'bg-accent text-accent-fg' : 'bg-brand/10 text-muted'}`}
                >
                    {required
                        ? CATALOG_TEXTS.required
                        : many
                          ? CATALOG_TEXTS.optionalMany
                          : CATALOG_TEXTS.optional}
                </span>
            </legend>
            {note && <p className="-mt-1 mb-2 text-sm text-muted">{note}</p>}
            <div className="surface divide-y divide-line/40 overflow-hidden">
                {rows.map((c) => {
                    const on = isOn(c.label);
                    const off = !!c.disabled && !on;
                    return (
                        <label
                            key={c.label}
                            className={`flex items-center gap-3 px-4 py-3.5 transition ${off ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-brand/5'}`}
                        >
                            <input
                                className="peer sr-only"
                                type={many ? 'checkbox' : 'radio'}
                                name={name}
                                checked={on}
                                disabled={off}
                                onChange={() => onPick(c.label)}
                            />
                            <span
                                aria-hidden
                                className={`grid h-5 w-5 shrink-0 place-items-center border-2 border-line transition peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25 ${many ? 'rounded-md' : 'rounded-full'}`}
                            >
                                <span
                                    className={`h-2 w-2 bg-brand-fg ${on ? 'opacity-100' : 'opacity-0'} ${many ? 'rounded-sm' : 'rounded-full'}`}
                                />
                            </span>
                            <span className="flex-1">{c.label}</span>
                            {c.price && (
                                <span className="text-sm text-muted">{c.price}</span>
                            )}
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
