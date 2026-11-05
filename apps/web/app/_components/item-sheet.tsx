'use client';

import type { ProductView } from '@elo/core/api/views/catalog.view';
import type { ReactNode } from 'react';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { formatBRL } from '@elo/core/money/cents';
import { Button } from '@elo/ui/components/forms/button';
import { Textarea } from '@elo/ui/components/forms/fields';
import { Sheet } from '@elo/ui/components/overlays/sheet';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { rule, useForm } from '../_lib/use-form';
import { ProductPlaceholder, TagChips } from './menu-list';

const NOTES_CHECKS = { notes: rule(FIELD_RULES.orderNotes) };
const QUANTITY_MAX = 50;

/**
 * Frame of an item sheet: photo, name, price, description, the choices given as
 * children, a note and the quantity. `unitCents` is null while the choices are not
 * valid yet; `missing` names the first group still to fill.
 */
export function ItemSheet({
    product,
    price,
    missing,
    unitCents,
    blocked,
    onClose,
    onAdd,
    children
}: {
    product: ProductView;
    price: ReactNode;
    missing: string | null;
    unitCents: number | null;
    /** Why nothing more can be added right now (a full bag), shown in place of the add button. */
    blocked?: string | null;
    onClose: () => void;
    onAdd: (line: { quantity: number; notes: string }) => void;
    children: ReactNode;
}) {
    const [quantity, setQuantity] = useState(1);
    const form = useForm({ notes: '' }, NOTES_CHECKS);
    const notes = form.values.notes;
    const add = () => {
        if (unitCents !== null && form.validate())
            onAdd({ quantity, notes: notes.trim() });
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
                                onClick={() =>
                                    setQuantity((q) => Math.min(QUANTITY_MAX, q + 1))
                                }
                            >
                                <Plus size={17} />
                            </button>
                        </div>
                        <Button
                            className="flex-1 !py-3.5"
                            disabled={!!missing || unitCents === null || !!blocked}
                            onClick={add}
                        >
                            {missing
                                ? `Escolha: ${missing}`
                                : `Adicionar · ${formatBRL((unitCents ?? 0) * quantity)}`}
                        </Button>
                    </div>
                </>
            }
        >
            <p className="mt-1 font-semibold text-brand">{price}</p>
            <TagChips tags={product.tags} />
            {product.description && (
                <p className="mt-3 text-muted">{product.description}</p>
            )}

            <div className="mt-5 space-y-6">
                {children}
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
