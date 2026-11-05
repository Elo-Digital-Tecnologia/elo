'use client';

import type {
    CategoryView,
    PizzaSetup,
    ProductView
} from '@elo/core/api/views/catalog.view';
import type { ProductTag } from '@elo/core/catalog/product-tags';
import { flavorStartingPrice } from '@elo/core/catalog/pizza-pricing';
import { startingPrice } from '@elo/core/catalog/product-pricing';
import { formatBRL } from '@elo/core/money/cents';
import { plainText } from '@elo/core/text/plain-text';
import { Input } from '@elo/ui/components/forms/fields';
import { motion } from '@elo/ui/components/motion/motion';
import { MOTION_SPRINGS } from '@elo/ui/theme/motion';
import { Plus, Search, Star, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GUEST_STICKY_TOP_VAR } from '#/_lib/constants/layout';
import { CATALOG_TEXTS, PRODUCT_TAG_LABEL } from '#/_lib/messages/catalog';

/** Price on a menu card: the cheapest one, with "from" when the choices change it. */
export function ProductPrice({
    product,
    pizza
}: {
    product: ProductView;
    /** Setup of the product's pizza category, when it is a flavor. */
    pizza?: PizzaSetup | null;
}) {
    const { cents, varies } = pizza
        ? flavorStartingPrice(pizza, product)
        : startingPrice(product);
    return (
        <>
            {varies && (
                <span className="mr-1 text-xs font-medium text-muted">
                    {CATALOG_TEXTS.priceFrom}
                </span>
            )}
            {formatBRL(cents)}
        </>
    );
}

/** Filters by name or description, ignoring accents and case. Categories without results are dropped. */
export function filterMenu(menu: CategoryView[], query: string): CategoryView[] {
    const q = plainText(query.trim());
    if (!q) return menu;
    return menu
        .map((c) => ({
            ...c,
            products: c.products.filter((p) =>
                plainText(`${p.name} ${p.description ?? ''}`).includes(q)
            )
        }))
        .filter((c) => c.products.length > 0);
}

/** Menu search field. */
export function MenuSearch({
    value,
    onChange
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="relative">
            <Input
                icon={<Search size={18} />}
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Buscar no cardápio"
                aria-label="Buscar no cardápio"
                className="!rounded-pill"
            />
            {value && (
                <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => onChange('')}
                    className="absolute inset-y-0 right-2 my-auto grid shrink-0 h-8 w-8 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-fg"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

/** Etiquetas do produto (vegetariano, picante...). */
export function TagChips({ tags }: { tags: ProductTag[] }) {
    if (!tags.length) return null;
    return (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
                <li
                    key={t}
                    className={`rounded-pill px-2 py-0.5 text-[11px] font-semibold ${t === 'new' ? 'bg-accent text-accent-fg' : t === 'spicy' ? 'bg-danger/12 text-danger' : 'bg-brand/10 text-brand'}`}
                >
                    {PRODUCT_TAG_LABEL[t]}
                </li>
            ))}
        </ul>
    );
}

/** Carousel of the products marked as featured. */
export function Highlights({
    menu,
    onPick
}: {
    menu: CategoryView[];
    onPick?: (p: ProductView) => void;
}) {
    const items = menu.flatMap((c) => c.products).filter((p) => p.featured);
    const pizzaOf = (p: ProductView) =>
        menu.find((c) => c.id === p.categoryId)?.pizza ?? null;
    if (!items.length) return null;
    return (
        <section aria-label="Destaques" className="py-3 pt-5">
            <h2 className="flex items-center gap-2 px-4 font-display text-xl font-extrabold">
                <Star size={18} className="fill-accent text-accent" aria-hidden />{' '}
                Destaques
            </h2>
            <ul className="scroll-soft mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                {items.map((p) => {
                    const body = (
                        <>
                            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-brand/10">
                                {p.imageUrl ? (
                                    <img
                                        src={
                                            p.imageUrl.startsWith('/api/media/')
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
                                    <ProductPlaceholder
                                        className="h-full w-full"
                                        size={36}
                                    />
                                )}
                            </div>
                            <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">
                                {p.name}
                            </h3>
                            <p className="text-sm font-semibold text-brand">
                                <ProductPrice product={p} pizza={pizzaOf(p)} />
                            </p>
                        </>
                    );
                    return (
                        <li key={p.id} className="w-40 shrink-0 snap-start">
                            {onPick ? (
                                <button
                                    type="button"
                                    onClick={() => onPick(p)}
                                    aria-label={`Ver ${p.name}`}
                                    className="block w-full text-left transition active:scale-[0.97]"
                                >
                                    {body}
                                </button>
                            ) : (
                                body
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

/** Below this much of the top, a section counts as the one being read. */
const TABS_WATCH_TOP_PX = 110;

/** Height of what is pinned above the tabs (the guest's status bar), if anything. */
const stickyTop = () =>
    parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(GUEST_STICKY_TOP_VAR)
    ) || 0;

/** Category tabs pinned to the top. The active tab follows the scroll; tapping goes to the section. */
export function CategoryTabs({ menu }: { menu: CategoryView[] }) {
    const [active, setActive] = useState(menu[0]?.id);
    const bar = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                const hit = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
                    )[0];
                if (hit) setActive(hit.target.id.replace('cat-', ''));
            },
            { rootMargin: `-${TABS_WATCH_TOP_PX + stickyTop()}px 0px -70% 0px` }
        );
        menu.forEach((c) => {
            const el = document.getElementById(`cat-${c.id}`);
            if (el) io.observe(el);
        });
        return () => io.disconnect();
    }, [menu]);

    // Keeps the active tab in view inside the bar, without moving the page scroll.
    useEffect(() => {
        const tab = bar.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
        if (tab && bar.current)
            bar.current.scrollTo({
                left: tab.offsetLeft - bar.current.clientWidth / 2 + tab.clientWidth / 2,
                behavior: 'smooth'
            });
    }, [active]);

    if (menu.length < 2) return null;
    return (
        <nav
            aria-label="Categorias"
            className="glass-bar sticky top-[var(--guest-sticky-top,0px)] z-20"
        >
            <div
                ref={bar}
                className="scroll-soft mx-auto flex max-w-2xl gap-1 overflow-x-auto px-2"
            >
                {menu.map((c) => (
                    <a
                        key={c.id}
                        data-cat={c.id}
                        href={`#cat-${c.id}`}
                        aria-current={active === c.id ? 'true' : undefined}
                        className={`relative shrink-0 px-4 py-3.5 text-sm font-semibold transition-colors ${active === c.id ? 'text-brand' : 'text-muted hover:text-fg'}`}
                    >
                        {c.name}
                        {active === c.id && (
                            <motion.span
                                layoutId="tab-line"
                                className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-brand"
                                transition={{
                                    ...MOTION_SPRINGS.list
                                }}
                            />
                        )}
                    </a>
                ))}
            </div>
        </nav>
    );
}

/** Stand-in for a product without a photo, so every item keeps the same shape in the list. */
export function ProductPlaceholder({
    className = '',
    size = 28
}: {
    className?: string;
    size?: number;
}) {
    return (
        <div
            className={`grid place-items-center bg-brand/10 text-brand/60 ${className}`}
            aria-hidden
        >
            <UtensilsCrossed size={size} strokeWidth={1.5} />
        </div>
    );
}

function Photo({ product }: { product: ProductView }) {
    // Image library: the list uses the thumbnail; external links stay as they are.
    const src = product.imageUrl!.startsWith('/api/media/')
        ? product.imageUrl!.replace(/\.webp$/, '-sm.webp')
        : product.imageUrl!;
    return (
        <img
            src={src}
            alt=""
            width={96}
            height={96}
            loading="lazy"
            className="h-24 w-24 rounded-2xl object-cover"
        />
    );
}

function Row({
    product,
    pizza,
    onPick
}: {
    product: ProductView;
    pizza: PizzaSetup | null;
    onPick?: (p: ProductView) => void;
}) {
    const content = (
        <>
            <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-snug">{product.name}</h3>
                {product.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {product.description}
                    </p>
                )}
                <TagChips tags={product.tags} />
                <p className="mt-2 font-semibold text-brand">
                    <ProductPrice product={product} pizza={pizza} />
                </p>
            </div>
            <div className="relative shrink-0">
                {product.imageUrl ? (
                    <Photo product={product} />
                ) : (
                    <ProductPlaceholder className="h-24 w-24 rounded-2xl" />
                )}
                {onPick && (
                    <span
                        className="absolute bottom-1.5 right-1.5 grid shrink-0 h-8 w-8 place-items-center rounded-pill bg-brand text-brand-fg shadow-md"
                        aria-hidden
                    >
                        <Plus size={18} />
                    </span>
                )}
            </div>
        </>
    );
    return onPick ? (
        <button
            type="button"
            onClick={() => onPick(product)}
            aria-label={`Adicionar ${product.name}`}
            className="flex w-full gap-4 py-4 text-left transition active:bg-brand/5"
        >
            {content}
        </button>
    ) : (
        <div className="flex gap-4 py-4">{content}</div>
    );
}

/** Menu list in rows. Without `onPick`, it is read-only (fixed link). */
export function MenuList({
    menu,
    onPick,
    searching = false
}: {
    menu: CategoryView[];
    onPick?: (product: ProductView) => void;
    searching?: boolean;
}) {
    return (
        <div className="px-4">
            {menu.map((cat) => (
                <section
                    key={cat.id}
                    id={`cat-${cat.id}`}
                    className="scroll-mt-[calc(var(--guest-sticky-top,0px)+3.5rem)] pt-6"
                >
                    <h2 className="font-display text-xl font-extrabold">{cat.name}</h2>
                    <ul className="cv-auto mt-1 divide-y divide-line/40">
                        {cat.products.map((p) => (
                            <li key={p.id}>
                                <Row product={p} pizza={cat.pizza} onPick={onPick} />
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            {menu.length === 0 && (
                <p className="py-10 text-center text-muted">
                    {searching
                        ? 'Nenhum item encontrado.'
                        : 'O cardápio ainda não tem itens.'}
                </p>
            )}
        </div>
    );
}
