'use client';

import type { OptionGroup, ProductView } from '@elo/core/api/views/catalog.view';
import type { ChosenOption, PricedOption } from '@elo/core/catalog/product-pricing';
import { FlavorPricing, OptionGroupKind } from '@elo/core/catalog/option-kinds';
import {
    flavorPriceAt,
    groupsInFillOrder,
    kindOf,
    maxFlavorsOf,
    priceSelection,
    sizeGroupOf
} from '@elo/core/catalog/product-pricing';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { formatBRL } from '@elo/core/money/cents';
import { Button } from '@elo/ui/components/forms/button';
import { Textarea } from '@elo/ui/components/forms/fields';
import { Sheet } from '@elo/ui/components/overlays/sheet';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { CATALOG_TEXTS } from '../_lib/messages/catalog';
import { rule, useForm } from '../_lib/use-form';
import { ProductPlaceholder, ProductPrice, TagChips } from './menu-list';

export interface CartLine {
    product: ProductView;
    quantity: number;
    notes: string;
    options: PricedOption[];
}

/** Unit price of a bag line, from the product as the menu shows it now. */
export const lineUnit = (l: CartLine) => {
    const r = priceSelection(l.product, l.options);
    return r.ok ? r.unitCents : 0;
};

const NOTES_CHECKS = { notes: rule(FIELD_RULES.orderNotes) };

interface SheetProps {
    onAdd: (line: CartLine) => void;
    onClose: () => void;
    /** Why nothing more can be added right now (a full bag), shown in place of the add button. */
    blocked?: string | null;
}

/** Product detail: photo, options, note and quantity. */
export function ProductSheet({
    product,
    ...rest
}: SheetProps & { product: ProductView | null }) {
    // The body remounts per product to reset quantity and choices.
    return product ? <Body key={product.id} product={product} {...rest} /> : null;
}

function Body({
    product,
    onAdd,
    onClose,
    blocked
}: SheetProps & { product: ProductView }) {
    const [quantity, setQuantity] = useState(1);
    const form = useForm({ notes: '' }, NOTES_CHECKS);
    const notes = form.values.notes;
    const [chosen, setChosen] = useState<ChosenOption[]>([]);

    const sizeGroup = sizeGroupOf(product.options);
    const sizeLabel = chosen.find((o) => o.group === sizeGroup?.name)?.label;
    const size = sizeGroup?.choices.find((c) => c.label === sizeLabel);
    const flavorLimit = size ? maxFlavorsOf(size) : 0;

    const isOn = (group: string, label: string) =>
        chosen.some((o) => o.group === group && o.label === label);

    const toggle = (g: OptionGroup, label: string) =>
        setChosen((cur) => {
            const kind = kindOf(g);
            if (isOn(g.name, label) && kind !== OptionGroupKind.SIZE)
                return cur.filter((o) => !(o.group === g.name && o.label === label));
            const single =
                kind === OptionGroupKind.SIZE ||
                (kind === OptionGroupKind.EXTRA && !g.multiple);
            const base = single ? cur.filter((o) => o.group !== g.name) : cur;
            const next = [...base, { group: g.name, label }];
            if (kind !== OptionGroupKind.SIZE) return next;
            // A smaller size keeps only the first flavors it takes.
            const max = maxFlavorsOf(g.choices.find((c) => c.label === label)!);
            let flavors = 0;
            return next.filter((o) => {
                const og = product.options.find((x) => x.name === o.group);
                if (!og || kindOf(og) !== OptionGroupKind.FLAVOR) return true;
                flavors += 1;
                return flavors <= max;
            });
        });

    const missing = product.options.filter(
        (g) =>
            (g.required || kindOf(g) !== OptionGroupKind.EXTRA) &&
            !chosen.some((o) => o.group === g.name)
    );
    const priced = priceSelection(product, chosen);
    const unit = priced.ok ? priced.unitCents : 0;

    const add = () => {
        if (priced.ok && form.validate())
            onAdd({ product, quantity, notes: notes.trim(), options: priced.options });
    };

    /** What each choice shows next to its name. */
    const choicePrice = (g: OptionGroup, c: OptionGroup['choices'][number]) => {
        const kind = kindOf(g);
        if (kind === OptionGroupKind.FLAVOR) {
            const p = sizeLabel ? flavorPriceAt(c, sizeLabel) : null;
            return p === null ? null : formatBRL(p);
        }
        if (kind === OptionGroupKind.SIZE)
            return product.options.some((x) => kindOf(x) === OptionGroupKind.FLAVOR)
                ? null
                : formatBRL(c.priceCents);
        return c.priceCents > 0 ? `+ ${formatBRL(c.priceCents)}` : null;
    };

    const groupNote = (g: OptionGroup) => {
        const kind = kindOf(g);
        if (kind === OptionGroupKind.FLAVOR)
            return size
                ? `${CATALOG_TEXTS.flavorsUpTo(flavorLimit)}${flavorLimit > 1 ? ` · ${g.flavorPricing === FlavorPricing.AVERAGE ? CATALOG_TEXTS.flavorsAverage : CATALOG_TEXTS.flavorsHighest}` : ''}`
                : CATALOG_TEXTS.chooseSizeFirst;
        return null;
    };

    return (
        <Sheet
            open
            onClose={onClose}
            media={
                product.imageUrl ? (
                    <img
                        src={product.imageUrl}
                        alt=""
                        className="aspect-[4/3] w-full object-cover"
                    />
                ) : (
                    <ProductPlaceholder className="aspect-[4/3] w-full" size={48} />
                )
            }
            title={product.name}
            footer={
                <>
                    {blocked && (
                        <p role="alert" className="mb-3 text-sm text-danger">
                            {blocked}
                        </p>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="surface flex items-center !rounded-pill p-1">
                            <button
                                aria-label="Menos"
                                className="grid shrink-0 h-10 w-10 place-items-center rounded-pill transition active:scale-90 hover:bg-brand/10"
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            >
                                <Minus size={17} />
                            </button>
                            <span className="w-8 text-center font-bold tabular-nums">
                                {quantity}
                            </span>
                            <button
                                aria-label="Mais"
                                className="grid shrink-0 h-10 w-10 place-items-center rounded-pill transition active:scale-90 hover:bg-brand/10"
                                onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                            >
                                <Plus size={17} />
                            </button>
                        </div>
                        <Button
                            className="flex-1 !py-3.5"
                            disabled={missing.length > 0 || !priced.ok || !!blocked}
                            onClick={add}
                        >
                            {missing.length > 0
                                ? `Escolha: ${missing[0].name}`
                                : `Adicionar · ${formatBRL(unit * quantity)}`}
                        </Button>
                    </div>
                </>
            }
        >
            <p className="mt-1 font-semibold text-brand">
                <ProductPrice product={product} />
            </p>
            <TagChips tags={product.tags} />
            {product.description && (
                <p className="mt-3 text-muted">{product.description}</p>
            )}

            <div className="mt-5 space-y-6">
                {groupsInFillOrder(product.options).map((g) => {
                    const kind = kindOf(g);
                    const required = g.required || kind !== OptionGroupKind.EXTRA;
                    const many =
                        kind === OptionGroupKind.FLAVOR ||
                        (kind === OptionGroupKind.EXTRA && g.multiple);
                    const count = chosen.filter((o) => o.group === g.name).length;
                    const note = groupNote(g);
                    return (
                        <fieldset key={g.name}>
                            <legend className="mb-2 flex w-full items-center justify-between gap-3">
                                <span className="font-semibold">{g.name}</span>
                                <span
                                    className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${required ? 'bg-accent text-accent-fg' : 'bg-brand/10 text-muted'}`}
                                >
                                    {required
                                        ? CATALOG_TEXTS.required
                                        : g.multiple
                                          ? CATALOG_TEXTS.optionalMany
                                          : CATALOG_TEXTS.optional}
                                </span>
                            </legend>
                            {note && (
                                <p className="-mt-1 mb-2 text-sm text-muted">{note}</p>
                            )}
                            <div className="surface divide-y divide-line/40 overflow-hidden">
                                {g.choices.map((c) => {
                                    const on = isOn(g.name, c.label);
                                    const off =
                                        kind === OptionGroupKind.FLAVOR &&
                                        !on &&
                                        (!size ||
                                            (flavorLimit > 1 && count >= flavorLimit) ||
                                            flavorPriceAt(c, size.label) === null);
                                    const price = choicePrice(g, c);
                                    return (
                                        <label
                                            key={c.label}
                                            className={`flex items-center gap-3 px-4 py-3.5 transition ${off ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-brand/5'}`}
                                        >
                                            <input
                                                className="peer sr-only"
                                                type={
                                                    many && flavorLimit !== 1
                                                        ? 'checkbox'
                                                        : 'radio'
                                                }
                                                name={g.name}
                                                checked={on}
                                                disabled={off}
                                                onChange={() =>
                                                    kind === OptionGroupKind.FLAVOR &&
                                                    flavorLimit === 1
                                                        ? setChosen((cur) => [
                                                              ...cur.filter(
                                                                  (o) =>
                                                                      o.group !== g.name
                                                              ),
                                                              {
                                                                  group: g.name,
                                                                  label: c.label
                                                              }
                                                          ])
                                                        : toggle(g, c.label)
                                                }
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
                                            {price && (
                                                <span className="text-sm text-muted">
                                                    {price}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>
                    );
                })}

                <label className="block">
                    <span className="mb-2 block font-semibold">Observações</span>
                    <Textarea
                        {...form.bind('notes')}
                        rows={2}
                        maxLength={FIELD_RULES.orderNotes.max}
                        placeholder="Ex.: sem cebola"
                    />
                    <span aria-live="polite" className="mt-1.5 block text-xs">
                        {form.errors.notes ? (
                            <span className="text-danger">{form.errors.notes}</span>
                        ) : (
                            <span className="text-muted">
                                {notes.length}/{FIELD_RULES.orderNotes.max}
                            </span>
                        )}
                    </span>
                </label>
            </div>
        </Sheet>
    );
}
