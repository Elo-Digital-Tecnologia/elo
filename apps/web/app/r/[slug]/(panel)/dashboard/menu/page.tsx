'use client';

import type { CategoryView, ProductView } from '@elo/core/api/views/catalog.view';
import type { ProductTag } from '@elo/core/catalog/product-tags';
import type { FieldError } from '@elo/core/fields/field-rules';
import type { DraftGroup, GroupErrors } from './options-editor';
import type { PizzaDraft, PizzaErrors } from './pizza-setup-editor';
import { api } from '@elo/client/http/api-client';
import { ApiError } from '@elo/client/http/api-error';
import { HTTP_STATUS } from '@elo/client/http/http-status';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { CATEGORY_KINDS, CategoryKind } from '@elo/core/catalog/category-kinds';
import { PRODUCT_TAGS } from '@elo/core/catalog/product-tags';
import { FIELD_RULES, moneyError } from '@elo/core/fields/field-rules';
import { parseCents } from '@elo/core/money/cents';
import { Badge } from '@elo/ui/components/feedback/badge';
import {
    EmptyState,
    ErrorState,
    SkeletonCards
} from '@elo/ui/components/feedback/states';
import { Button } from '@elo/ui/components/forms/button';
import {
    Input,
    MoneyInput,
    Select,
    Switch,
    Textarea
} from '@elo/ui/components/forms/fields';
import { GlassCard } from '@elo/ui/components/layout/glass-card';
import { Field, PageHeader } from '@elo/ui/components/layout/section';
import { Stagger, StaggerItem } from '@elo/ui/components/motion/motion';
import { ActionMenu } from '@elo/ui/components/overlays/action-menu';
import { ConfirmModal } from '@elo/ui/components/overlays/confirm';
import { Modal } from '@elo/ui/components/overlays/modal';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    FolderPlus,
    ImageIcon,
    PackagePlus,
    Pencil,
    Star,
    Trash2,
    UtensilsCrossed
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { centsToInput } from '#/_lib/format';
import {
    CATEGORY_KIND_TEXTS,
    PRODUCT_PRICE_TEXTS,
    PRODUCT_TAG_LABEL
} from '#/_lib/messages/catalog';
import { MENU_ERRORS, PRODUCT_FORM_MESSAGES } from '#/_lib/messages/errors';
import { ImagePicker } from '../../../../../_components/image-picker';
import { ProductPrice } from '../../../../../_components/menu-list';
import { money, rule, unexpected, useForm } from '../../../../../_lib/use-form';
import { RequireRoles, useStaff } from '../../../_components/shell';
import {
    OptionsEditor,
    draftErrors,
    draftErrorsFromServer,
    draftPricedBySize,
    firstInvalid,
    fromDraft,
    toDraft
} from './options-editor';
import {
    PizzaSetupEditor,
    firstPizzaInvalid,
    fromPizzaDraft,
    pizzaDraftErrors,
    toPizzaDraft
} from './pizza-setup-editor';

const STEPS = ['Dados', 'Foto', 'Opções'] as const;

/** Sizes of the chosen pizza category, whose flavors are priced per size. */
type PizzaSizes = { id: string; label: string }[] | null;

interface Form {
    categoryId: string;
    name: string;
    price: string;
    /** Set while the chosen category is a pizza one. */
    pizzaSizes: PizzaSizes;
    /** Pizza flavor prices by size id, as typed. */
    sizePrices: Record<string, string>;
    description: string;
    imageUrl: string;
    featured: boolean;
    tags: ProductTag[];
    options: DraftGroup[];
}
const EMPTY: Form = {
    categoryId: '',
    name: '',
    price: '',
    pizzaSizes: null,
    sizePrices: {},
    description: '',
    imageUrl: '',
    featured: false,
    tags: [],
    options: []
};
const priceText = centsToInput;

/** A known refusal from the API in words, or the honest "something failed". */
const messageOf = (e: unknown) =>
    (e instanceof ApiError &&
        (MENU_ERRORS[e.code] ??
            (e.status === HTTP_STATUS.NOT_FOUND
                ? 'Este item não existe mais. Atualize a página.'
                : null))) ||
    unexpected(e);

const CATEGORY_CHECKS = { name: rule(FIELD_RULES.categoryName) };

/** A flavor is made in at least one size, and every typed price is a valid amount. */
function flavorPricesError(
    sizes: NonNullable<PizzaSizes>,
    prices: Record<string, string>
): FieldError | null {
    const typed = sizes.filter((s) => prices[s.id]?.trim());
    if (!typed.length) return { code: 'too_few', params: { min: 1 } };
    for (const s of typed) {
        const e = moneyError(FIELD_RULES.priceCents, prices[s.id]);
        if (e) return e;
    }
    return null;
}

const sizesOf = (menu: CategoryView[] | null, categoryId: string): PizzaSizes => {
    const pizza = menu?.find((c) => c.id === categoryId)?.pizza;
    return pizza ? pizza.sizes.map((s) => ({ id: s.id, label: s.label })) : null;
};

const PRODUCT_CHECKS = {
    categoryId: (v: string): FieldError | null => (v ? null : { code: 'invalid_option' }),
    name: rule(FIELD_RULES.productName),
    // A product priced by its sizes, or a pizza flavor, has no price of its own.
    price: (v: string, all: Form) =>
        all.pizzaSizes || draftPricedBySize(all.options)
            ? null
            : money(FIELD_RULES.priceCents)(v),
    sizePrices: (v: Record<string, string>, all: Form) =>
        all.pizzaSizes ? flavorPricesError(all.pizzaSizes, v) : null,
    description: rule(FIELD_RULES.productDescription),
    imageUrl: rule(FIELD_RULES.imageUrl)
};
type Checked = keyof typeof PRODUCT_CHECKS;

/** The step that holds each field: the photo is on the second, option groups on the third. */
const stepOf = (field: string) =>
    field.startsWith('options') ? 2 : field === 'imageUrl' ? 1 : 0;

const firstBad = (v: Form) =>
    (Object.keys(PRODUCT_CHECKS) as Checked[]).find((k) =>
        (PRODUCT_CHECKS[k] as (x: unknown, all: Form) => FieldError | null)(v[k], v)
    );

function View() {
    const { token } = useStaff();
    const [menu, setMenu] = useState<CategoryView[] | null>(null);
    const [removingProduct, setRemovingProduct] = useState<ProductView | null>(null);
    const [failed, setFailed] = useState(false);
    const [catOpen, setCatOpen] = useState(false);
    const [prodOpen, setProdOpen] = useState(false);
    const catForm = useForm({ name: '' }, CATEGORY_CHECKS);
    const [editCat, setEditCat] = useState<string | null>(null);
    const [catKind, setCatKind] = useState<CategoryKind>(CategoryKind.STANDARD);
    const [pizzaDraft, setPizzaDraft] = useState<PizzaDraft>(() => toPizzaDraft(null));
    const [pizzaServer, setPizzaServer] = useState<PizzaErrors | null>(null);
    const [catSubmitted, setCatSubmitted] = useState(false);
    const [editProd, setEditProd] = useState<string | null>(null);
    const form = useForm<Form>(EMPTY, PRODUCT_CHECKS, PRODUCT_FORM_MESSAGES);
    const [submitted, setSubmitted] = useState(false);
    /** A typed image link held back by the picker for not passing the rule. */
    const [linkBad, setLinkBad] = useState(false);
    const [optionsServer, setOptionsServer] = useState<GroupErrors[] | null>(null);
    const [step, setStep] = useState(0);
    /** Input to focus once its step is on screen. */
    const [focus, setFocus] = useState<string | null>(null);
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

    useEffect(() => {
        if (!focus) return;
        document.querySelector<HTMLElement>(`[name="${focus}"]`)?.focus();
        setFocus(null);
    }, [focus, step]);

    const goTo = (field: string) => {
        setStep(stepOf(field));
        setFocus(field);
    };

    /** Runs a change and reloads the menu. `onError` puts field errors in place first; anything else shows as a message. */
    const guard = async (
        fn: () => Promise<unknown>,
        onError?: (e: unknown) => boolean
    ) => {
        setError(null);
        setSaving(true);
        try {
            await fn();
            await load();
            return true;
        } catch (e) {
            if (!onError?.(e)) setError(messageOf(e));
            return false;
        } finally {
            setSaving(false);
        }
    };

    const openCategory = (c?: CategoryView) => {
        setError(null);
        setEditCat(c?.id ?? null);
        catForm.reset({ name: c?.name ?? '' });
        setCatKind(c?.kind ?? CategoryKind.STANDARD);
        setPizzaDraft(toPizzaDraft(c?.pizza ?? null));
        setPizzaServer(null);
        setCatSubmitted(false);
        setCatOpen(true);
    };

    const openProduct = (p?: ProductView, copy = false) => {
        setError(null);
        setStep(0);
        setSubmitted(false);
        setLinkBad(false);
        setOptionsServer(null);
        setEditProd(p && !copy ? p.id : null);
        form.reset(
            p
                ? {
                      categoryId: p.categoryId,
                      name: copy ? `${p.name} (cópia)` : p.name,
                      price: priceText(p.priceCents),
                      pizzaSizes: sizesOf(menu, p.categoryId),
                      sizePrices: Object.fromEntries(
                          Object.entries(p.sizePrices).map(([id, cents]) => [
                              id,
                              priceText(cents)
                          ])
                      ),
                      description: p.description ?? '',
                      imageUrl: p.imageUrl ?? '',
                      featured: p.featured,
                      tags: p.tags,
                      options: toDraft(p.options)
                  }
                : {
                      ...EMPTY,
                      categoryId: menu?.length === 1 ? menu[0].id : '',
                      pizzaSizes: menu?.length === 1 ? sizesOf(menu, menu[0].id) : null
                  }
        );
        setProdOpen(true);
    };

    const saveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setCatSubmitted(true);
        const pizza = catKind === CategoryKind.PIZZA;
        const nameOk = catForm.validate();
        const pizzaBad = pizza ? firstPizzaInvalid(pizzaDraftErrors(pizzaDraft)) : null;
        if (pizzaBad)
            document.querySelector<HTMLElement>(`[name="${pizzaBad}"]`)?.focus();
        if (!nameOk || pizzaBad) return;
        const body = {
            name: catForm.values.name,
            ...(editCat ? {} : { kind: catKind }),
            ...(pizza ? { pizza: fromPizzaDraft(pizzaDraft) } : {})
        };
        const call = editCat
            ? () =>
                  api(`/api/catalog/categories/${editCat}`, {
                      method: 'PUT',
                      body,
                      token
                  })
            : () => api('/api/catalog/categories', { body, token });
        const fromServer = (err: unknown) => {
            const landed = catForm.fromServer(err);
            if (!(err instanceof ApiError)) return landed;
            const onPizza = Object.fromEntries(
                Object.entries(err.fields).filter(([path]) => path.startsWith('pizza'))
            ) as PizzaErrors;
            const any = Object.keys(onPizza).length > 0;
            setPizzaServer(any ? onPizza : null);
            return landed || any;
        };
        if (await guard(call, fromServer)) {
            setEditCat(null);
            setCatOpen(false);
        }
    };

    const setOptions = (options: DraftGroup[]) => {
        form.set('options', options);
        setOptionsServer(null);
    };

    /** Field errors sent back by the API, under their inputs, opening the step of the first one. */
    const productFromServer = (err: unknown) => {
        if (!(err instanceof ApiError)) return false;
        const sizePaths = Object.fromEntries(
            (form.values.pizzaSizes ?? []).map((s) => [
                `sizePrices.${s.id}`,
                'sizePrices' as const
            ])
        );
        const landed = form.fromServer(err, { priceCents: 'price', ...sizePaths });
        const options = draftErrorsFromServer(form.values.options, err.fields);
        setOptionsServer(options);
        const field =
            Object.keys(err.fields)
                .map((p) => (p === 'priceCents' ? 'price' : p))
                .find((p) => p in form.values) ?? firstInvalid(options);
        if (field) goTo(field);
        else if (err.code === ApiErrorCode.INVALID_CATEGORY) goTo('categoryId');
        return landed || !!options;
    };

    // A pizza flavor has no options step: its choices come from the category.
    const steps = form.values.pizzaSizes ? STEPS.slice(0, 2) : STEPS;
    useEffect(() => {
        if (step >= steps.length) setStep(steps.length - 1);
    }, [step, steps.length]);

    const saveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        form.validate();
        setSubmitted(true);
        const v = form.values;
        const bad =
            firstBad(v) ??
            (linkBad ? 'imageUrl' : null) ??
            (v.pizzaSizes ? null : firstInvalid(draftErrors(v.options)));
        if (bad) return goTo(bad);
        const common = {
            categoryId: v.categoryId,
            name: v.name.trim(),
            description: v.description.trim() || undefined,
            imageUrl: v.imageUrl.trim() || undefined,
            featured: v.featured,
            tags: v.tags
        };
        // A pizza flavor sends its prices per size and no options of its own.
        const body = v.pizzaSizes
            ? {
                  ...common,
                  sizePrices: Object.fromEntries(
                      v.pizzaSizes.flatMap((s) => {
                          const cents = parseCents(v.sizePrices[s.id] ?? '');
                          return cents === null ? [] : [[s.id, cents]];
                      })
                  )
              }
            : {
                  ...common,
                  priceCents: draftPricedBySize(v.options)
                      ? undefined
                      : (parseCents(v.price) ?? 0),
                  options: fromDraft(v.options)
              };
        const call = editProd
            ? () =>
                  api(`/api/catalog/products/${editProd}`, { method: 'PUT', body, token })
            : () => api('/api/catalog/products', { body, token });
        if (await guard(call, productFromServer)) {
            form.reset(EMPTY);
            setEditProd(null);
            setProdOpen(false);
        }
    };

    // Swaps the item with its neighbor and saves the whole list in the new order.
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
        if (ids)
            void guard(() =>
                api('/api/catalog/categories/order', {
                    method: 'PATCH',
                    body: { ids },
                    token
                })
            );
    };
    const moveProduct = (c: CategoryView, id: string, dir: -1 | 1) => {
        const ids = move(c.products, id, dir);
        if (ids)
            void guard(() =>
                api('/api/catalog/products/order', {
                    method: 'PATCH',
                    body: { categoryId: c.id, ids },
                    token
                })
            );
    };

    const removeCategory = (c: CategoryView) =>
        guard(() => api(`/api/catalog/categories/${c.id}`, { method: 'DELETE', token }));

    const noCategories = menu?.length === 0;

    return (
        <>
            <PageHeader
                title="Cardápio"
                actions={
                    <>
                        <Button variant="soft" onClick={() => openCategory()}>
                            <FolderPlus size={17} /> Nova categoria
                        </Button>
                        <Button disabled={noCategories} onClick={() => openProduct()}>
                            <PackagePlus size={17} /> Novo produto
                        </Button>
                    </>
                }
            />
            {failed && (
                <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>
                    Não foi possível carregar o cardápio.
                </ErrorState>
            )}
            {!menu && !failed && <SkeletonCards count={3} />}
            {noCategories && (
                <EmptyState
                    icon={UtensilsCrossed}
                    title="Nenhuma categoria"
                    action={
                        <Button onClick={() => openCategory()}>Criar categoria</Button>
                    }
                >
                    Crie uma categoria, como Pizzas ou Bebidas, para cadastrar os
                    produtos.
                </EmptyState>
            )}
            {error && !prodOpen && !catOpen && (
                <p role="alert" className="mb-4 text-sm text-danger">
                    {error}
                </p>
            )}

            <div className="space-y-8">
                {menu?.map((c, ci) => (
                    <section key={c.id}>
                        <h2 className="mb-3 flex items-center gap-1 text-2xl font-bold">
                            {c.name}
                            <button
                                aria-label={`Subir categoria ${c.name}`}
                                disabled={ci === 0}
                                className="grid shrink-0 h-8 w-8 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30"
                                onClick={() => moveCategory(c.id, -1)}
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                aria-label={`Descer categoria ${c.name}`}
                                disabled={ci === (menu?.length ?? 1) - 1}
                                className="grid shrink-0 h-8 w-8 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30"
                                onClick={() => moveCategory(c.id, 1)}
                            >
                                <ChevronDown size={16} />
                            </button>
                            <span className="text-base font-normal">
                                <ActionMenu
                                    title={`Categoria ${c.name}`}
                                    items={[
                                        {
                                            label: 'Editar categoria',
                                            icon: Pencil,
                                            onSelect: () => openCategory(c)
                                        },
                                        {
                                            label: 'Remover categoria',
                                            icon: Trash2,
                                            danger: true,
                                            disabledReason: c.products.length
                                                ? 'Remova ou mova os produtos dela antes.'
                                                : null,
                                            onSelect: () => removeCategory(c)
                                        }
                                    ]}
                                />
                            </span>
                        </h2>
                        {c.products.length === 0 && (
                            <p className="text-sm text-muted">Sem produtos.</p>
                        )}
                        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {c.products.map((p, pi) => (
                                <StaggerItem key={p.id} className="[&>*]:h-full">
                                    <GlassCard
                                        lift
                                        className={`flex gap-4 p-4 ${p.available ? '' : 'opacity-70'}`}
                                    >
                                        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-md bg-leaf-100/50 text-muted">
                                            {p.imageUrl ? (
                                                <img
                                                    src={
                                                        p.imageUrl.startsWith(
                                                            '/api/media/'
                                                        )
                                                            ? p.imageUrl.replace(
                                                                  /\.webp$/,
                                                                  '-sm.webp'
                                                              )
                                                            : p.imageUrl
                                                    }
                                                    alt=""
                                                    loading="lazy"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon
                                                    size={26}
                                                    aria-label="Sem foto"
                                                />
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold leading-tight">
                                                    {p.featured && (
                                                        <Star
                                                            size={14}
                                                            aria-label="Destaque"
                                                            className="mr-1 inline fill-accent text-accent"
                                                        />
                                                    )}
                                                    {p.name}
                                                </h3>
                                                <span className="font-display font-bold text-brand">
                                                    <ProductPrice
                                                        product={p}
                                                        pizza={c.pizza}
                                                    />
                                                </span>
                                            </div>
                                            {p.description && (
                                                <p className="line-clamp-2 text-sm text-muted">
                                                    {p.description}
                                                </p>
                                            )}
                                            {(p.options.length > 0 ||
                                                p.tags.length > 0) && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {p.tags.map((t) => (
                                                        <Badge key={t} tone="brand">
                                                            {PRODUCT_TAG_LABEL[t]}
                                                        </Badge>
                                                    ))}
                                                    {p.options.map((o) => (
                                                        <Badge
                                                            key={o.name}
                                                            tone="neutral"
                                                        >
                                                            {o.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
                                                <label className="flex items-center gap-2 text-sm">
                                                    <Switch
                                                        label={`Disponível: ${p.name}`}
                                                        checked={p.available}
                                                        onChange={(v) =>
                                                            guard(() =>
                                                                api(
                                                                    `/api/catalog/products/${p.id}/availability`,
                                                                    {
                                                                        method: 'PATCH',
                                                                        body: {
                                                                            available: v
                                                                        },
                                                                        token
                                                                    }
                                                                )
                                                            )
                                                        }
                                                    />
                                                    {p.available
                                                        ? 'Disponível'
                                                        : 'Esgotado'}
                                                </label>
                                                <span className="-mr-1.5 flex shrink-0">
                                                    <button
                                                        aria-label={`Subir ${p.name}`}
                                                        disabled={pi === 0}
                                                        className="grid shrink-0 h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30"
                                                        onClick={() =>
                                                            moveProduct(c, p.id, -1)
                                                        }
                                                    >
                                                        <ChevronUp size={16} />
                                                    </button>
                                                    <button
                                                        aria-label={`Descer ${p.name}`}
                                                        disabled={
                                                            pi === c.products.length - 1
                                                        }
                                                        className="grid shrink-0 h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30"
                                                        onClick={() =>
                                                            moveProduct(c, p.id, 1)
                                                        }
                                                    >
                                                        <ChevronDown size={16} />
                                                    </button>
                                                    <ActionMenu
                                                        title={p.name}
                                                        items={[
                                                            {
                                                                label: 'Editar',
                                                                icon: Pencil,
                                                                onSelect: () =>
                                                                    openProduct(p)
                                                            },
                                                            {
                                                                label: 'Duplicar',
                                                                icon: Copy,
                                                                onSelect: () =>
                                                                    openProduct(p, true)
                                                            },
                                                            {
                                                                label: 'Remover',
                                                                icon: Trash2,
                                                                danger: true,
                                                                onSelect: () =>
                                                                    setRemovingProduct(p)
                                                            }
                                                        ]}
                                                    />
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

            <Modal
                open={catOpen}
                onClose={() => setCatOpen(false)}
                title={editCat ? 'Editar categoria' : 'Nova categoria'}
                sheet
            >
                <form onSubmit={saveCategory} noValidate className="space-y-4">
                    <Field label="Nome" error={catForm.errors.name}>
                        <Input
                            {...catForm.bind('name')}
                            placeholder="Bebidas"
                            maxLength={FIELD_RULES.categoryName.max}
                            data-autofocus
                        />
                    </Field>
                    <div className="space-y-2">
                        <p className="text-sm font-medium">{CATEGORY_KIND_TEXTS.label}</p>
                        <div role="radiogroup" className="flex flex-wrap gap-2">
                            {CATEGORY_KINDS.map((k) => {
                                const on = catKind === k;
                                return (
                                    <button
                                        key={k}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        disabled={!!editCat && !on}
                                        onClick={() => setCatKind(k)}
                                        className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-40 ${on ? 'border-brand bg-brand text-brand-fg' : 'border-line/70 hover:border-brand/60'}`}
                                    >
                                        {CATEGORY_KIND_TEXTS.kinds[k]}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted">
                            {CATEGORY_KIND_TEXTS.hints[catKind]}
                            {editCat && ` ${CATEGORY_KIND_TEXTS.fixed}`}
                        </p>
                    </div>
                    {catKind === CategoryKind.PIZZA && (
                        <PizzaSetupEditor
                            value={pizzaDraft}
                            onChange={(d) => {
                                setPizzaDraft(d);
                                setPizzaServer(null);
                            }}
                            showAll={catSubmitted}
                            server={pizzaServer}
                        />
                    )}
                    {error && (
                        <p role="alert" className="text-sm text-danger">
                            {error}
                        </p>
                    )}
                    <div className="flex justify-end">
                        <Button type="submit" loading={saving}>
                            {editCat ? 'Salvar' : 'Criar categoria'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={prodOpen}
                onClose={() => setProdOpen(false)}
                title={editProd ? 'Editar produto' : 'Novo produto'}
                sheet
            >
                <form onSubmit={saveProduct} noValidate className="space-y-5">
                    <div
                        className="glass flex !rounded-pill p-1 text-sm font-semibold"
                        role="tablist"
                    >
                        {steps.map((label, i) => (
                            <button
                                key={label}
                                type="button"
                                role="tab"
                                aria-selected={step === i}
                                onClick={() => setStep(i)}
                                className={`flex-1 rounded-pill px-3 py-2 transition ${step === i ? 'btn-glass' : 'text-muted hover:text-fg'}`}
                            >
                                {i + 1}. {label}
                            </button>
                        ))}
                    </div>

                    {step === 0 && (
                        <div className="space-y-4">
                            <Field label="Categoria" error={form.errors.categoryId}>
                                <Select
                                    {...form.bind('categoryId')}
                                    onChange={(e) => {
                                        form.set('categoryId', e.target.value);
                                        form.set(
                                            'pizzaSizes',
                                            sizesOf(menu, e.target.value)
                                        );
                                    }}
                                >
                                    <option value="">Escolha uma categoria</option>
                                    {menu?.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                                <Field label="Nome" error={form.errors.name}>
                                    <Input
                                        {...form.bind('name')}
                                        maxLength={FIELD_RULES.productName.max}
                                        data-autofocus
                                    />
                                </Field>
                                {form.values.pizzaSizes ? null : draftPricedBySize(
                                      form.values.options
                                  ) ? (
                                    <Field label="Preço">
                                        <p className="pt-2 text-sm text-muted">
                                            {PRODUCT_PRICE_TEXTS.bySize}
                                        </p>
                                    </Field>
                                ) : (
                                    <Field label="Preço" error={form.errors.price}>
                                        <MoneyInput {...form.bind('price')} />
                                    </Field>
                                )}
                            </div>
                            {form.values.pizzaSizes ? (
                                <fieldset>
                                    <legend className="mb-1 text-sm font-medium">
                                        {PRODUCT_PRICE_TEXTS.pizzaTitle}
                                    </legend>
                                    <p className="mb-2 text-xs text-muted">
                                        {PRODUCT_PRICE_TEXTS.pizzaHint}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {form.values.pizzaSizes.map((s, i) => (
                                            <label key={s.id} className="block">
                                                <span className="mb-1 block truncate text-xs text-muted">
                                                    {s.label}
                                                </span>
                                                <MoneyInput
                                                    name={
                                                        i === 0 ? 'sizePrices' : undefined
                                                    }
                                                    value={
                                                        form.values.sizePrices[s.id] ?? ''
                                                    }
                                                    invalid={!!form.errors.sizePrices}
                                                    aria-label={`${PRODUCT_PRICE_TEXTS.pizzaTitle}: ${s.label}`}
                                                    onChange={(e) =>
                                                        form.set('sizePrices', {
                                                            ...form.values.sizePrices,
                                                            [s.id]: e.target.value
                                                        })
                                                    }
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    {form.errors.sizePrices && (
                                        <p
                                            aria-live="polite"
                                            className="mt-2 text-xs text-danger"
                                        >
                                            {form.errors.sizePrices}
                                        </p>
                                    )}
                                </fieldset>
                            ) : (
                                !draftPricedBySize(form.values.options) && (
                                    <p className="-mt-2 text-xs text-muted">
                                        {PRODUCT_PRICE_TEXTS.hint}
                                    </p>
                                )
                            )}
                            <label className="flex items-center gap-3 text-sm font-medium">
                                <Switch
                                    label="Destaque"
                                    checked={form.values.featured}
                                    onChange={(featured) =>
                                        form.set('featured', featured)
                                    }
                                />
                                Destaque no cardápio
                            </label>
                            <fieldset>
                                <legend className="mb-2 text-sm font-medium">
                                    Etiquetas
                                </legend>
                                <div className="flex flex-wrap gap-2">
                                    {PRODUCT_TAGS.map((t) => {
                                        const on = form.values.tags.includes(t);
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() =>
                                                    form.set(
                                                        'tags',
                                                        on
                                                            ? form.values.tags.filter(
                                                                  (x) => x !== t
                                                              )
                                                            : [...form.values.tags, t]
                                                    )
                                                }
                                                className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium transition ${on ? 'border-brand bg-brand text-brand-fg' : 'border-line/70 hover:border-brand/60'}`}
                                            >
                                                {PRODUCT_TAG_LABEL[t]}
                                            </button>
                                        );
                                    })}
                                </div>
                                {form.errors.tags && (
                                    <p
                                        aria-live="polite"
                                        className="mt-2 text-xs text-danger"
                                    >
                                        {form.errors.tags}
                                    </p>
                                )}
                            </fieldset>
                            <Field
                                label="Descrição"
                                hint={`${form.values.description.length}/${FIELD_RULES.productDescription.max}`}
                                error={form.errors.description}
                            >
                                <Textarea
                                    {...form.bind('description')}
                                    rows={3}
                                    maxLength={FIELD_RULES.productDescription.max}
                                    placeholder="Ingredientes, tamanho da porção..."
                                />
                            </Field>
                        </div>
                    )}
                    {step === 1 && (
                        <ImagePicker
                            token={token}
                            value={form.values.imageUrl}
                            onChange={(imageUrl) => form.set('imageUrl', imageUrl)}
                            error={form.errors.imageUrl}
                            showErrors={submitted}
                            onLinkError={setLinkBad}
                        />
                    )}
                    {step === 2 && !form.values.pizzaSizes && (
                        <>
                            <OptionsEditor
                                value={form.values.options}
                                onChange={setOptions}
                                showAll={submitted}
                                server={optionsServer}
                            />
                            {form.errors.options && (
                                <p aria-live="polite" className="text-xs text-danger">
                                    {form.errors.options}
                                </p>
                            )}
                        </>
                    )}

                    {error && (
                        <p role="alert" className="text-sm text-danger">
                            {error}
                        </p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={step === 0}
                            onClick={() => setStep(step - 1)}
                        >
                            Voltar
                        </Button>
                        {step < steps.length - 1 ? (
                            <span className="flex gap-2">
                                <Button type="submit" variant="soft" loading={saving}>
                                    Salvar
                                </Button>
                                <Button type="button" onClick={() => setStep(step + 1)}>
                                    Avançar
                                </Button>
                            </span>
                        ) : (
                            <Button type="submit" loading={saving}>
                                {editProd ? 'Salvar produto' : 'Criar produto'}
                            </Button>
                        )}
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                open={!!removingProduct}
                title={`Remover ${removingProduct?.name ?? ''}?`}
                confirmLabel="Remover"
                danger
                onConfirm={async () => {
                    const p = removingProduct;
                    setRemovingProduct(null);
                    if (p)
                        await guard(() =>
                            api(`/api/catalog/products/${p.id}`, {
                                method: 'DELETE',
                                token
                            })
                        );
                }}
                onClose={() => setRemovingProduct(null)}
            >
                <p>
                    O produto sai do cardápio dos clientes. Para tirar só por um tempo,
                    use a chave "Disponível".
                </p>
            </ConfirmModal>
        </>
    );
}

export default function MenuPage() {
    return (
        <RequireRoles roles={['restaurant_admin', 'manager']}>
            <View />
        </RequireRoles>
    );
}
