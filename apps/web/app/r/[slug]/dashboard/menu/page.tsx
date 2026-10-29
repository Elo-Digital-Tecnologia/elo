'use client';

import { ChevronDown, ChevronUp, Copy, FolderPlus, ImageIcon, PackagePlus, Pencil, Star, Trash2, UtensilsCrossed } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { formatBRL, parseCents, PRODUCT_TAG_LABEL, PRODUCT_TAGS, type CategoryView, type ProductTag, type ProductView } from '@elo/core';
import { Badge, Button, EmptyState, ErrorState, Field, GlassCard, Input, Modal, MoneyInput, PageHeader, SkeletonCards, Stagger, StaggerItem, Switch } from '@elo/ui';
import { Shell, useStaff } from '../../_components/shell';
import { ImagePicker } from '../../../../_components/image-picker';
import { fromDraft, OptionsEditor, toDraft, type DraftGroup } from './options-editor';

const STEPS = ['Dados', 'Foto', 'Opções'] as const;

interface Form {
  categoryId: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  featured: boolean;
  tags: ProductTag[];
  options: DraftGroup[];
}
const EMPTY: Form = { categoryId: '', name: '', price: '', description: '', imageUrl: '', featured: false, tags: [], options: [] };
const money = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

const ERRORS: Record<string, string> = {
  category_not_empty: 'Esta categoria ainda tem produtos. Mova ou remova os produtos primeiro.',
};

function View() {
  const { token } = useStaff();
  const [menu, setMenu] = useState<CategoryView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [editCat, setEditCat] = useState<string | null>(null);
  const [editProd, setEditProd] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0);
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
      setError(e instanceof ApiError ? (ERRORS[e.code] ?? 'Não foi possível salvar. Confira os campos.') : 'Não foi possível salvar.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openCategory = (c?: CategoryView) => {
    setError(null);
    setEditCat(c?.id ?? null);
    setCatName(c?.name ?? '');
    setCatOpen(true);
  };

  const openProduct = (p?: ProductView, copy = false) => {
    setError(null);
    setStep(0);
    setEditProd(p && !copy ? p.id : null);
    setForm(
      p
        ? { categoryId: p.categoryId, name: copy ? `${p.name} (cópia)` : p.name, price: money(p.priceCents), description: p.description ?? '', imageUrl: p.imageUrl ?? '', featured: p.featured, tags: p.tags, options: toDraft(p.options) }
        : { ...EMPTY, categoryId: menu?.length === 1 ? menu[0].id : '' },
    );
    setProdOpen(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const call = editCat
      ? () => api(`/api/catalog/categories/${editCat}`, { method: 'PUT', body: { name: catName }, token })
      : () => api('/api/catalog/categories', { body: { name: catName }, token });
    if (await guard(call)) {
      setCatName('');
      setEditCat(null);
      setCatOpen(false);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseCents(form.price);
    if (!form.categoryId || !form.name.trim() || cents === null) {
      setStep(0);
      return setError('Informe categoria, nome e um preço válido, como 39,90.');
    }
    const options = fromDraft(form.options);
    if (options === null) {
      setStep(2);
      return setError('Cada grupo precisa de nome e ao menos uma escolha, com valor válido.');
    }
    const body = { categoryId: form.categoryId, name: form.name.trim(), priceCents: cents, description: form.description.trim() || undefined, imageUrl: form.imageUrl.trim() || undefined, featured: form.featured, tags: form.tags, options };
    const call = editProd
      ? () => api(`/api/catalog/products/${editProd}`, { method: 'PUT', body, token })
      : () => api('/api/catalog/products', { body, token });
    if (await guard(call)) {
      setForm(EMPTY);
      setEditProd(null);
      setProdOpen(false);
    }
  };

  // Troca o item com o vizinho e grava a lista inteira na nova ordem.
  const move = <T extends { id: string }>(list: T[], id: string, dir: -1 | 1) => {
    const ids = list.map((x) => x.id);
    const from = ids.indexOf(id);
    const to = from + dir;
    if (to < 0 || to >= ids.length) return null;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    return ids;
  };
  const moveCategory = (id: string, dir: -1 | 1) => {
    const ids = menu && move(menu, id, dir);
    if (ids) void guard(() => api('/api/catalog/categories/order', { method: 'PATCH', body: { ids }, token }));
  };
  const moveProduct = (c: CategoryView, id: string, dir: -1 | 1) => {
    const ids = move(c.products, id, dir);
    if (ids) void guard(() => api('/api/catalog/products/order', { method: 'PATCH', body: { categoryId: c.id, ids }, token }));
  };

  const removeCategory = (c: CategoryView) => guard(() => api(`/api/catalog/categories/${c.id}`, { method: 'DELETE', token }));

  const noCategories = menu?.length === 0;

  return (
    <>
      <PageHeader
        title="Cardápio"
        actions={
          <>
            <Button variant="soft" onClick={() => openCategory()}><FolderPlus size={17} /> Nova categoria</Button>
            <Button disabled={noCategories} onClick={() => openProduct()}><PackagePlus size={17} /> Novo produto</Button>
          </>
        }
      />
      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar o cardápio.</ErrorState>}
      {!menu && !failed && <SkeletonCards count={3} />}
      {noCategories && <EmptyState icon={UtensilsCrossed} title="Nenhuma categoria" action={<Button onClick={() => openCategory()}>Criar categoria</Button>}>Crie uma categoria, como Pizzas ou Bebidas, para cadastrar os produtos.</EmptyState>}
      {error && !prodOpen && !catOpen && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}

      <div className="space-y-8">
        {menu?.map((c, ci) => (
          <section key={c.id}>
            <h2 className="mb-3 flex items-center gap-1 text-2xl font-bold">
              {c.name}
              <button aria-label={`Subir categoria ${c.name}`} disabled={ci === 0} className="grid h-8 w-8 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30" onClick={() => moveCategory(c.id, -1)}><ChevronUp size={16} /></button>
              <button aria-label={`Descer categoria ${c.name}`} disabled={ci === (menu?.length ?? 1) - 1} className="grid h-8 w-8 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30" onClick={() => moveCategory(c.id, 1)}><ChevronDown size={16} /></button>
              <button aria-label={`Editar categoria ${c.name}`} className="grid h-8 w-8 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand" onClick={() => openCategory(c)}><Pencil size={15} /></button>
              {c.products.length === 0 && (
                <button aria-label={`Remover categoria ${c.name}`} className="grid h-8 w-8 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger" onClick={() => removeCategory(c)}><Trash2 size={15} /></button>
              )}
            </h2>
            {c.products.length === 0 && <p className="text-sm text-muted">Sem produtos.</p>}
            <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {c.products.map((p, pi) => (
                <StaggerItem key={p.id} className="[&>*]:h-full">
                  <GlassCard lift className={`flex gap-4 p-4 ${p.available ? '' : 'opacity-70'}`}>
                    <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-md bg-leaf-100/50 text-muted">
                      {p.imageUrl ? (
                        <img src={p.imageUrl.startsWith('/api/media/') ? p.imageUrl.replace(/\.webp$/, '-sm.webp') : p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon size={26} aria-label="Sem foto" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight">{p.featured && <Star size={14} aria-label="Destaque" className="mr-1 inline fill-accent text-accent" />}{p.name}</h3>
                        <span className="font-display font-bold text-brand">{formatBRL(p.priceCents)}</span>
                      </div>
                      {p.description && <p className="line-clamp-2 text-sm text-muted">{p.description}</p>}
                      {(p.options.length > 0 || p.tags.length > 0) && <div className="flex flex-wrap gap-1.5">{p.tags.map((t) => <Badge key={t} tone="brand">{PRODUCT_TAG_LABEL[t]}</Badge>)}{p.options.map((o) => <Badge key={o.name} tone="neutral">{o.name}</Badge>)}</div>}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
                        <label className="flex items-center gap-2 text-sm">
                          <Switch label={`Disponível: ${p.name}`} checked={p.available} onChange={(v) => guard(() => api(`/api/catalog/products/${p.id}/availability`, { method: 'PATCH', body: { available: v }, token }))} />
                          {p.available ? 'Disponível' : 'Esgotado'}
                        </label>
                        <span className="-mr-1.5 flex shrink-0">
                          <button aria-label={`Subir ${p.name}`} disabled={pi === 0} className="grid h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30" onClick={() => moveProduct(c, p.id, -1)}><ChevronUp size={16} /></button>
                          <button aria-label={`Descer ${p.name}`} disabled={pi === c.products.length - 1} className="grid h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30" onClick={() => moveProduct(c, p.id, 1)}><ChevronDown size={16} /></button>
                          <button aria-label={`Duplicar ${p.name}`} className="grid h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand" onClick={() => openProduct(p, true)}><Copy size={16} /></button>
                          <button aria-label={`Editar ${p.name}`} className="grid h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand" onClick={() => openProduct(p)}><Pencil size={16} /></button>
                          <button aria-label={`Remover ${p.name}`} className="grid h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger" onClick={() => guard(() => api(`/api/catalog/products/${p.id}`, { method: 'DELETE', token }))}><Trash2 size={16} /></button>
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        ))}
      </div>

      <Modal open={catOpen} onClose={() => setCatOpen(false)} title={editCat ? 'Editar categoria' : 'Nova categoria'} sheet>
        <form onSubmit={saveCategory} className="space-y-4">
          <Field label="Nome"><Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Pizzas" maxLength={80} required autoFocus /></Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={saving}>{editCat ? 'Salvar' : 'Criar categoria'}</Button></div>
        </form>
      </Modal>

      <Modal open={prodOpen} onClose={() => setProdOpen(false)} title={editProd ? 'Editar produto' : 'Novo produto'} sheet>
        <form onSubmit={saveProduct} className="space-y-5">
          <div className="glass flex !rounded-pill p-1 text-sm font-semibold" role="tablist">
            {STEPS.map((label, i) => (
              <button key={label} type="button" role="tab" aria-selected={step === i} onClick={() => setStep(i)} className={`flex-1 rounded-pill px-3 py-2 transition ${step === i ? 'btn-glass' : 'text-muted hover:text-fg'}`}>
                {i + 1}. {label}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <Field label="Categoria">
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Escolha uma categoria</option>
                  {menu?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required autoFocus /></Field>
                <Field label="Preço"><MoneyInput value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></Field>
              </div>
              <label className="flex items-center gap-3 text-sm font-medium">
                <Switch label="Destaque" checked={form.featured} onChange={(featured) => setForm({ ...form, featured })} />
                Destaque no cardápio
              </label>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Etiquetas</legend>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_TAGS.map((t) => {
                    const on = form.tags.includes(t);
                    return (
                      <button key={t} type="button" aria-pressed={on} onClick={() => setForm({ ...form, tags: on ? form.tags.filter((x) => x !== t) : [...form.tags, t] })} className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium transition ${on ? 'border-brand bg-brand text-brand-fg' : 'border-line/70 hover:border-brand/60'}`}>
                        {PRODUCT_TAG_LABEL[t]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <Field label="Descrição" hint={`${form.description.length}/500`}>
                <textarea rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ingredientes, tamanho da porção..." />
              </Field>
            </div>
          )}
          {step === 1 && <ImagePicker token={token} value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />}
          {step === 2 && <OptionsEditor value={form.options} onChange={(options) => setForm({ ...form, options })} />}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Voltar</Button>
            {step < STEPS.length - 1 ? (
              <span className="flex gap-2">
                <Button type="submit" variant="soft" loading={saving}>Salvar</Button>
                <Button type="button" onClick={() => setStep(step + 1)}>Avançar</Button>
              </span>
            ) : (
              <Button type="submit" loading={saving}>{editProd ? 'Salvar produto' : 'Criar produto'}</Button>
            )}
          </div>
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
