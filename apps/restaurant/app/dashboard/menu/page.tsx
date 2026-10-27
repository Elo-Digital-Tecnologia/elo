'use client';

import { FolderPlus, PackagePlus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { formatBRL, parseCents, type CategoryView, type OptionGroup } from '@elo/core';
import { Badge, Button, EmptyState, ErrorState, Field, GlassCard, Modal, PageHeader, SkeletonCards, Stagger, StaggerItem } from '@elo/ui';
import { Shell, useStaff } from '../../_components/shell';

/** "Tamanho|obrigatório|única" + linhas "M=0" / "G=10,00" */
function parseGroups(text: string): OptionGroup[] | null {
  const groups: OptionGroup[] = [];
  for (const block of text.split(/\n\s*\n/).filter((b) => b.trim())) {
    const [head, ...rest] = block.trim().split('\n');
    const [name, req, mult] = head.split('|').map((s) => s.trim());
    if (!name) return null;
    const choices = [];
    for (const line of rest) {
      const [label, price] = line.split('=').map((s) => s.trim());
      const cents = parseCents(price ?? '0');
      if (!label || cents === null) return null;
      choices.push({ label, priceCents: cents });
    }
    groups.push({ name, required: req === 'obrigatório', multiple: mult === 'múltipla', choices });
  }
  return groups;
}

const EMPTY = { categoryId: '', name: '', price: '', description: '', options: '' };

function View() {
  const { token } = useStaff();
  const [menu, setMenu] = useState<CategoryView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setMenu(await api<CategoryView[]>('/api/catalog', { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const guard = async (fn: () => Promise<unknown>) => {
    setError(null);
    setSaving(true);
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'Não foi possível salvar.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await guard(() => api('/api/catalog/categories', { body: { name: catName }, token }))) {
      setCatName('');
      setCatOpen(false);
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseCents(form.price);
    const options = parseGroups(form.options);
    if (cents === null || options === null || !form.categoryId) return setError('Confira categoria, preço e opções.');
    if (await guard(() => api('/api/catalog/products', { body: { categoryId: form.categoryId, name: form.name, priceCents: cents, description: form.description || undefined, options }, token }))) {
      setForm(EMPTY);
      setProdOpen(false);
    }
  };

  const noCategories = menu?.length === 0;

  return (
    <>
      <PageHeader
        title="Cardápio"
        description="Categorias, produtos, preços e disponibilidade. Mudanças aparecem para os clientes na hora."
        actions={
          <>
            <Button variant="soft" onClick={() => { setError(null); setCatOpen(true); }}><FolderPlus size={17} /> Nova categoria</Button>
            <Button disabled={noCategories} onClick={() => { setError(null); setProdOpen(true); }}><PackagePlus size={17} /> Novo produto</Button>
          </>
        }
      />
      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar o cardápio.</ErrorState>}
      {!menu && !failed && <SkeletonCards count={3} />}
      {noCategories && <EmptyState icon={UtensilsCrossed} title="Seu cardápio está vazio" action={<Button onClick={() => setCatOpen(true)}>Criar primeira categoria</Button>}>Comece criando uma categoria, como Pizzas ou Bebidas. Depois adicione os produtos.</EmptyState>}

      <div className="space-y-8">
        {menu?.map((c) => (
          <section key={c.id}>
            <h2 className="mb-3 text-2xl font-bold">{c.name}</h2>
            {c.products.length === 0 && <p className="text-sm text-muted">Sem produtos nesta categoria.</p>}
            <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {c.products.map((p) => (
                <StaggerItem key={p.id}>
                  <GlassCard lift className={`flex h-full flex-col gap-3 p-5 ${p.available ? '' : 'opacity-70'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold leading-tight">{p.name}</h3>
                      <span className="font-display text-xl font-bold text-brand">{formatBRL(p.priceCents)}</span>
                    </div>
                    {p.description && <p className="text-sm text-muted">{p.description}</p>}
                    {p.options.length > 0 && <div className="flex flex-wrap gap-1.5">{p.options.map((o) => <Badge key={o.name} tone="neutral">{o.name}</Badge>)}</div>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <button
                        role="switch"
                        aria-checked={p.available}
                        onClick={() => guard(() => api(`/api/catalog/products/${p.id}/availability`, { method: 'PATCH', body: { available: !p.available }, token }))}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <span className={`relative h-6 w-11 rounded-pill transition-colors ${p.available ? 'bg-brand' : 'bg-line'}`}>
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ease-elo ${p.available ? 'left-[22px]' : 'left-0.5'}`} />
                        </span>
                        {p.available ? 'Disponível' : 'Indisponível'}
                      </button>
                      <button aria-label={`Remover ${p.name}`} className="grid h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger" onClick={() => guard(() => api(`/api/catalog/products/${p.id}`, { method: 'DELETE', token }))}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </GlassCard>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        ))}
      </div>

      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Nova categoria" sheet>
        <form onSubmit={addCategory} className="space-y-4">
          <Field label="Nome"><input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ex.: Pizzas" required autoFocus /></Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={saving}>Criar categoria</Button></div>
        </form>
      </Modal>

      <Modal open={prodOpen} onClose={() => setProdOpen(false)} title="Novo produto" sheet>
        <form onSubmit={addProduct} className="space-y-4">
          <Field label="Categoria">
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              <option value="">Escolha</option>
              {menu?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Preço"><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="39,90" required /></Field>
          </div>
          <Field label="Descrição"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Opções (opcional)" hint="Um grupo por bloco, separados por linha em branco. Primeira linha: Nome|obrigatório|única. Depois: escolha=preço.">
            <textarea rows={5} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder={'Tamanho|obrigatório|única\nM=0\nG=10,00'} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={saving}>Criar produto</Button></div>
        </form>
      </Modal>
    </>
  );
}

export default function MenuPage() {
  return (
    <Shell roles={['restaurant_admin']}>
      <View />
    </Shell>
  );
}
