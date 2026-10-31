'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { FIELD_RULES, formatBRL, type ProductView } from '@elo/core';
import { Button, Sheet, Textarea } from '@elo/ui';
import { rule, useForm } from '../_lib/use-form';
import { ProductPlaceholder, TagChips } from './menu-list';

export interface CartLine {
  product: ProductView;
  quantity: number;
  notes: string;
  options: { group: string; label: string; priceCents: number }[];
}

export const lineUnit = (l: CartLine) => l.product.priceCents + l.options.reduce((s, o) => s + o.priceCents, 0);

const NOTES_CHECKS = { notes: rule(FIELD_RULES.orderNotes) };

interface SheetProps {
  onAdd: (line: CartLine) => void;
  onClose: () => void;
  /** Why nothing more can be added right now (a full bag), shown in place of the add button. */
  blocked?: string | null;
}

/** Detalhe do produto: foto, opções, observação e quantidade. */
export function ProductSheet({ product, ...rest }: SheetProps & { product: ProductView | null }) {
  // O corpo remonta por produto para zerar quantidade e escolhas.
  return product ? <Body key={product.id} product={product} {...rest} /> : null;
}

function Body({ product, onAdd, onClose, blocked }: SheetProps & { product: ProductView }) {
  const [quantity, setQuantity] = useState(1);
  const form = useForm({ notes: '' }, NOTES_CHECKS);
  const notes = form.values.notes;
  const [chosen, setChosen] = useState<CartLine['options']>([]);

  const toggle = (group: string, multiple: boolean, label: string, priceCents: number) =>
    setChosen((cur) => {
      const has = cur.some((o) => o.group === group && o.label === label);
      if (has) return cur.filter((o) => !(o.group === group && o.label === label));
      const base = multiple ? cur : cur.filter((o) => o.group !== group);
      return [...base, { group, label, priceCents }];
    });

  const missing = product.options.filter((g) => g.required && !chosen.some((o) => o.group === g.name));
  const unit = product.priceCents + chosen.reduce((s, o) => s + o.priceCents, 0);

  const add = () => {
    if (form.validate()) onAdd({ product, quantity, notes: notes.trim(), options: chosen });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      media={product.imageUrl ? <img src={product.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" /> : <ProductPlaceholder className="aspect-[4/3] w-full" size={48} />}
      title={product.name}
      footer={
        <>
          {blocked && <p role="alert" className="mb-3 text-sm text-danger">{blocked}</p>}
          <div className="flex items-center gap-3">
            <div className="surface flex items-center !rounded-pill p-1">
              <button aria-label="Menos" className="grid shrink-0 h-10 w-10 place-items-center rounded-pill transition active:scale-90 hover:bg-brand/10" onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus size={17} /></button>
              <span className="w-8 text-center font-bold tabular-nums">{quantity}</span>
              <button aria-label="Mais" className="grid shrink-0 h-10 w-10 place-items-center rounded-pill transition active:scale-90 hover:bg-brand/10" onClick={() => setQuantity((q) => Math.min(50, q + 1))}><Plus size={17} /></button>
            </div>
            <Button className="flex-1 !py-3.5" disabled={missing.length > 0 || !!blocked} onClick={add}>
              {missing.length > 0 ? `Escolha: ${missing[0].name}` : `Adicionar · ${formatBRL(unit * quantity)}`}
            </Button>
          </div>
        </>
      }
    >
      <p className="mt-1 font-semibold text-brand">
        {product.options.some((o) => o.required) && <span className="mr-1 text-xs font-medium text-muted">a partir de</span>}
        {formatBRL(product.priceCents)}
      </p>
      <TagChips tags={product.tags} />
      {product.description && <p className="mt-3 text-muted">{product.description}</p>}

      <div className="mt-5 space-y-6">
        {product.options.map((g) => (
          <fieldset key={g.name}>
            <legend className="mb-2 flex w-full items-center justify-between gap-3">
              <span className="font-semibold">{g.name}</span>
              <span className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${g.required ? 'bg-accent text-accent-fg' : 'bg-brand/10 text-muted'}`}>{g.required ? 'Obrigatório' : g.multiple ? 'Opcional · vários' : 'Opcional'}</span>
            </legend>
            <div className="surface divide-y divide-line/40 overflow-hidden">
              {g.choices.map((c) => {
                const on = chosen.some((o) => o.group === g.name && o.label === c.label);
                return (
                  <label key={c.label} className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition hover:bg-brand/5">
                    <input className="peer sr-only" type={g.multiple ? 'checkbox' : 'radio'} name={g.name} checked={on} onChange={() => toggle(g.name, g.multiple, c.label, c.priceCents)} />
                    <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center border-2 border-line transition peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25 ${g.multiple ? 'rounded-md' : 'rounded-full'}`}>
                      <span className={`h-2 w-2 bg-brand-fg ${on ? 'opacity-100' : 'opacity-0'} ${g.multiple ? 'rounded-sm' : 'rounded-full'}`} />
                    </span>
                    <span className="flex-1">{c.label}</span>
                    {c.priceCents > 0 && <span className="text-sm text-muted">+ {formatBRL(c.priceCents)}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <label className="block">
          <span className="mb-2 block font-semibold">Observações</span>
          <Textarea {...form.bind('notes')} rows={2} maxLength={FIELD_RULES.orderNotes.max} placeholder="Ex.: sem cebola" />
          <span aria-live="polite" className="mt-1.5 block text-xs">
            {form.errors.notes ? <span className="text-danger">{form.errors.notes}</span> : <span className="text-muted">{notes.length}/{FIELD_RULES.orderNotes.max}</span>}
          </span>
        </label>
      </div>
    </Sheet>
  );
}
