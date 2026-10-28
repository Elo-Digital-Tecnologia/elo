'use client';

import { Plus, Trash2 } from 'lucide-react';
import { parseCents, type OptionGroup } from '@elo/core';
import { Button, Field, Input, MoneyInput, Switch } from '@elo/ui';

/** Grupo em edição: o preço fica como texto digitado até salvar. */
export interface DraftGroup {
  name: string;
  required: boolean;
  multiple: boolean;
  choices: { label: string; price: string }[];
}

const money = (cents: number) => (cents ? (cents / 100).toFixed(2).replace('.', ',') : '');

export const toDraft = (groups: OptionGroup[]): DraftGroup[] =>
  groups.map((g) => ({ ...g, choices: g.choices.map((c) => ({ label: c.label, price: money(c.priceCents) })) }));

/** Converte para o formato da API; null quando algum preço é inválido. */
export function fromDraft(drafts: DraftGroup[]): OptionGroup[] | null {
  const out: OptionGroup[] = [];
  for (const g of drafts) {
    if (!g.name.trim() && g.choices.every((c) => !c.label.trim())) continue;
    const choices = [];
    for (const c of g.choices) {
      if (!c.label.trim()) continue;
      const cents = c.price.trim() ? parseCents(c.price) : 0;
      if (cents === null) return null;
      choices.push({ label: c.label.trim(), priceCents: cents });
    }
    if (!g.name.trim() || choices.length === 0) return null;
    out.push({ name: g.name.trim(), required: g.required, multiple: g.multiple, choices });
  }
  return out;
}

const emptyGroup = (): DraftGroup => ({ name: '', required: false, multiple: false, choices: [{ label: '', price: '' }] });

/** Editor de grupos de opções (tamanho, adicionais, ponto da carne...). */
export function OptionsEditor({ value, onChange }: { value: DraftGroup[]; onChange: (next: DraftGroup[]) => void }) {
  const patch = (i: number, g: Partial<DraftGroup>) => onChange(value.map((x, k) => (k === i ? { ...x, ...g } : x)));
  const setChoice = (i: number, j: number, c: Partial<DraftGroup['choices'][number]>) =>
    patch(i, { choices: value[i].choices.map((x, k) => (k === j ? { ...x, ...c } : x)) });

  return (
    <div className="space-y-4">
      {value.length === 0 && <p className="text-sm text-muted">Sem opções. Use para tamanhos, adicionais ou o ponto da carne.</p>}
      {value.map((g, i) => (
        <fieldset key={i} className="space-y-3 rounded-lg border border-line/60 p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Nome do grupo"><Input value={g.name} onChange={(e) => patch(i, { name: e.target.value })} placeholder="Tamanho" maxLength={80} /></Field>
            </div>
            <button type="button" aria-label="Remover grupo" onClick={() => onChange(value.filter((_, k) => k !== i))} className="mb-1 grid h-10 w-10 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger"><Trash2 size={17} /></button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2.5"><Switch label="Obrigatório" checked={g.required} onChange={(v) => patch(i, { required: v })} /> Obrigatório</label>
            <label className="flex items-center gap-2.5"><Switch label="Permite mais de uma" checked={g.multiple} onChange={(v) => patch(i, { multiple: v })} /> Mais de uma escolha</label>
          </div>
          <ul className="space-y-2">
            {g.choices.map((c, j) => (
              <li key={j} className="flex items-center gap-2">
                <Input value={c.label} onChange={(e) => setChoice(i, j, { label: e.target.value })} placeholder="Grande" aria-label="Nome da escolha" maxLength={80} />
                <div className="w-36 shrink-0"><MoneyInput value={c.price} onChange={(e) => setChoice(i, j, { price: e.target.value })} aria-label="Valor adicional" /></div>
                <button type="button" aria-label="Remover escolha" disabled={g.choices.length === 1} onClick={() => patch(i, { choices: g.choices.filter((_, k) => k !== j) })} className="grid h-10 w-10 shrink-0 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-30"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" onClick={() => patch(i, { choices: [...g.choices, { label: '', price: '' }] })}><Plus size={16} /> Adicionar escolha</Button>
        </fieldset>
      ))}
      <Button type="button" variant="soft" onClick={() => onChange([...value, emptyGroup()])}><Plus size={16} /> Adicionar grupo de opções</Button>
    </div>
  );
}
