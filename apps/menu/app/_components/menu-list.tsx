'use client';

import { Plus, UtensilsCrossed } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatBRL, type CategoryView, type ProductView } from '@elo/core';
import { GlassCard, motion } from '@elo/ui';

/** Cor do prato varia por produto, sempre dentro da rampa de verdes do tema. */
const PLATE = ['--elo-leaf-300', '--elo-aurora-2', '--elo-aurora-3', '--elo-leaf-400', '--elo-mint'];

function Plate({ product, index }: { product: ProductView; index: number }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" loading="lazy" />;
  }
  const c = PLATE[index % PLATE.length];
  return (
    <span
      className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg text-fg/70"
      style={{ background: `radial-gradient(circle at 30% 25%, hsl(var(--elo-glass-edge) / 0.7), hsl(var(${c}) / 0.85) 60%, hsl(var(--elo-leaf-500) / 0.9))` }}
      aria-hidden
    >
      <UtensilsCrossed size={32} />
    </span>
  );
}

/** Chips de categoria que acompanham a rolagem e levam à seção. */
export function CategoryNav({ menu }: { menu: CategoryView[] }) {
  const [active, setActive] = useState(menu[0]?.id);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id.replace('cat-', ''));
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    menu.forEach((c) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [menu]);

  if (menu.length < 2) return null;
  return (
    <nav aria-label="Categorias" className="sticky top-3 z-20 -mx-1 overflow-x-auto px-1 py-1 scroll-soft">
      <div className="glass glass-strong inline-flex gap-1 !rounded-pill p-1.5">
        {menu.map((c) => (
          <a
            key={c.id}
            href={`#cat-${c.id}`}
            className={`relative whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${active === c.id ? 'text-brand-fg' : 'text-muted hover:text-fg'}`}
          >
            {active === c.id && <motion.span layoutId="chip" className="btn-glass absolute inset-0 -z-10 rounded-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            {c.name}
          </a>
        ))}
      </div>
    </nav>
  );
}

/** Lista do cardápio. Sem `onPick`, é somente consulta (link fixo). */
export function MenuList({ menu, onPick }: { menu: CategoryView[]; onPick?: (product: ProductView) => void }) {
  let n = 0;
  return (
    <div className="space-y-10">
      {menu.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
          <h2 className="mb-4 text-3xl font-extrabold">{cat.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {cat.products.map((p) => {
              const i = n++;
              const body = (
                <div className="flex items-center gap-4 p-3.5 text-left">
                  <Plate product={p} index={i} />
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold leading-tight">{p.name}</div>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                    <div className="mt-2 font-display text-xl font-bold text-brand">
                      {p.options.some((o) => o.required) ? 'a partir de ' : ''}
                      {formatBRL(p.priceCents)}
                    </div>
                  </div>
                  {onPick && (
                    <span className="btn-glass grid h-11 w-11 shrink-0 place-items-center rounded-pill" aria-hidden>
                      <Plus size={22} />
                    </span>
                  )}
                </div>
              );
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                  <GlassCard lift={!!onPick}>
                    {onPick ? (
                      <button className="block w-full rounded-[inherit] transition active:scale-[0.98]" onClick={() => onPick(p)} aria-label={`Adicionar ${p.name}`}>
                        {body}
                      </button>
                    ) : (
                      body
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
      {menu.length === 0 && <p className="text-muted">O cardápio ainda não tem itens.</p>}
    </div>
  );
}
