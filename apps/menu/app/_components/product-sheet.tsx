'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatBRL, type ProductView } from '@elo/core';
import { Button, Modal } from '@elo/ui';

export interface CartLine {
  product: ProductView;
  quantity: number;
  notes: string;
  options: { group: string; label: string; priceCents: number }[];
}

export const lineUnit = (l: CartLine) => l.product.priceCents + l.options.reduce((s, o) => s + o.priceCents, 0);

/** Escolha de opções, quantidade e observações de um produto. */
export function ProductSheet({ product, onAdd, onClose }: { product: ProductView | null; onAdd: (line: CartLine) => void; onClose: () => void }) {
  return (
    <Modal open={!!product} onClose={onClose} title={product?.name} sheet>
      {product && <Body key={product.id} product={product} onAdd={onAdd} />}
    </Modal>
  );
}

function Body({ product, onAdd }: { product: ProductView; onAdd: (line: CartLine) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [chosen, setChosen] = useState<CartLine['options']>([]);

  const toggle = (group: string, multiple: boolean, label: string, priceCents: number) =>
    setChosen((cur) => {
      const has = cur.some((o) => o.group === group && o.label === label);
      if (has) return cur.filter((o) => !(o.group === group && o.label === label));
      const base = multiple ? cur : cur.filter((o) => o.group !== group);
      return [...base, { group, label, priceCents }];
    });

  const missing = product.options.some((g) => g.required && !chosen.some((o) => o.group === g.name));
  const unit = product.priceCents + chosen.reduce((s, o) => s + o.priceCents, 0);

  return (
    <div className="space-y-5">
      {product.description && <p className="text-muted">{product.description}</p>}

      {product.options.map((g) => (
        <fieldset key={g.name}>
          <legend className="mb-2 flex w-full items-center justify-between font-semibold">
            {g.name}
            <span className={`rounded-pill px-2.5 py-0.5 text-xs ${g.required ? 'bg-accent text-accent-fg' : 'bg-leaf-100 text-muted'}`}>{g.required ? 'Obrigatório' : 'Opcional'}</span>
          </legend>
          <div className="space-y-2">
            {g.choices.map((c) => {
              const on = chosen.some((o) => o.group === g.name && o.label === c.label);
              return (
                <label key={c.label} className={`flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition ${on ? 'border-brand bg-brand/10' : 'border-line/50 bg-leaf-50/40 hover:border-brand/50'}`}>
                  <span className="flex items-center gap-3">
                    <input type={g.multiple ? 'checkbox' : 'radio'} name={g.name} checked={on} onChange={() => toggle(g.name, g.multiple, c.label, c.priceCents)} />
                    {c.label}
                  </span>
                  {c.priceCents > 0 && <span className="text-sm text-muted">+ {formatBRL(c.priceCents)}</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <textarea rows={2} maxLength={300} placeholder="Alguma observação? Ex.: sem cebola" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="flex items-center justify-between gap-4">
        <div className="glass flex items-center gap-1 !rounded-pill p-1">
          <button aria-label="Menos" className="grid h-10 w-10 place-items-center rounded-pill transition active:scale-90 hover:bg-brand/10" onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus size={17} /></button>
          <span className="w-8 text-center font-bold tabular-nums">{quantity}</span>
          <button aria-label="Mais" className="grid h-10 w-10 place-items-center rounded-pill transition active:scale-90 hover:bg-brand/10" onClick={() => setQuantity((q) => Math.min(50, q + 1))}><Plus size={17} /></button>
        </div>
        <Button className="flex-1 !py-3.5" disabled={missing} onClick={() => onAdd({ product, quantity, notes: notes.trim(), options: chosen })}>
          {missing ? 'Escolha as opções' : `Adicionar · ${formatBRL(unit * quantity)}`}
        </Button>
      </div>
    </div>
  );
}
