'use client';

import { AnimatePresence, m as motion } from 'framer-motion';
import { ChevronsLeft, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Aurora } from './aurora';
import { Logo } from './logo';
import { PageTransition } from './motion';
import { ThemeToggle } from './theme';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Contador opcional (ex.: chamados pendentes). */
  badge?: number;
}

interface Props {
  brandSub: string;
  nav: NavItem[];
  /** Quem está logado. */
  user: { name: string; role: string };
  onLogout: () => void;
  /** Nó à esquerda do cabeçalho de ações (indicadores, status ao vivo...). */
  headerExtra?: ReactNode;
  footerLinks?: { label: string; href: string }[];
  defaultCollapsed?: boolean;
  /** Faixa acima do conteúdo (aviso de vencimento). */
  banner?: ReactNode;
  children: ReactNode;
}

const COLLAPSE_KEY = 'elo.sidebar';

function NavList({ nav, collapsed, onNavigate }: { nav: NavItem[]; collapsed: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  // Só o item mais específico fica marcado (/dashboard não acende em /dashboard/menu).
  const current = nav
    .filter((i) => path === i.href || path.startsWith(`${i.href}/`))
    .sort((x, y) => y.href.length - x.href.length)[0]?.href;
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1.5">
      {nav.map((item) => {
        const active = item.href === current;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-pill px-3.5 py-3 text-sm font-medium transition-colors ${
              active ? 'text-brand-fg' : 'text-muted hover:text-fg'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="btn-glass absolute inset-0 -z-10 rounded-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {!active && <span className="absolute inset-0 -z-10 rounded-pill bg-brand/0 transition group-hover:bg-brand/10" />}
            <Icon size={20} />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!!item.badge && (
              <span className={`${collapsed ? 'absolute right-1 top-1' : 'ml-auto'} grid min-w-5 place-items-center rounded-pill bg-accent px-1.5 text-xs font-bold text-accent-fg`}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Casca das aplicações: aurora, sidebar colapsável (drawer no mobile), header e footer. */
export function AppShell({ brandSub, nav, user, onLogout, headerExtra, footerLinks = [], defaultCollapsed = false, banner, children }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [drawer, setDrawer] = useState(false);
  const path = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved !== null) setCollapsed(saved === '1');
    } catch {
      /* storage indisponível */
    }
  }, []);

  useEffect(() => setDrawer(false), [path]);

  // Menu aberto no celular: a página atrás não rola.
  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawer]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* storage indisponível */
      }
      return !c;
    });

  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh">
      <Aurora />

      {/* Sidebar desktop */}
      <aside
        className="glass glass-strong fixed bottom-4 left-4 top-4 z-30 hidden flex-col p-3 transition-[width] duration-500 ease-elo lg:flex"
        style={{ width: collapsed ? 88 : 272 }}
      >
        <div className={`flex items-center px-2 py-3 ${collapsed ? 'justify-center' : ''}`}>
          {collapsed ? <Logo /> : <Logo sub={brandSub} />}
        </div>
        <div className="mt-3 flex-1 overflow-y-auto scroll-soft">
          <NavList nav={nav} collapsed={collapsed} />
        </div>
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          className="mt-2 flex items-center justify-center gap-2 rounded-pill py-2.5 text-sm text-muted transition hover:bg-brand/10 hover:text-fg"
        >
          <ChevronsLeft size={18} className={`transition-transform duration-500 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && 'Recolher'}
        </button>
      </aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-x-0 top-0 z-50 h-dvh lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="modal-backdrop absolute inset-0 bg-leaf-900/40 backdrop-blur-md" onClick={() => setDrawer(false)} aria-hidden />
            <motion.aside
              className="glass glass-strong absolute bottom-3 left-3 top-3 flex w-[min(300px,calc(100%-24px))] flex-col overflow-hidden p-3"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <div className="flex items-center justify-between px-2 py-3">
                <Logo sub={brandSub} />
                <button onClick={() => setDrawer(false)} aria-label="Fechar menu" className="grid h-9 w-9 place-items-center rounded-pill bg-leaf-100/60">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-3 flex-1 overflow-y-auto scroll-soft">
                <NavList nav={nav} collapsed={false} onNavigate={() => setDrawer(false)} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coluna principal */}
      <div className="flex min-h-dvh min-w-0 flex-col transition-[padding] duration-500 ease-elo lg:pl-[var(--shell-pad)]" style={{ ['--shell-pad' as string]: `${(collapsed ? 88 : 272) + 32}px` }}>
        <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4 sm:pt-4 lg:pr-6">
          <div className="glass glass-strong flex items-center gap-2 !rounded-pill py-2 pl-2.5 pr-2 sm:gap-3 sm:pl-3 sm:pr-2.5">
            <button onClick={() => setDrawer(true)} aria-label="Abrir menu" className="grid h-10 w-10 place-items-center rounded-pill transition hover:bg-brand/10 lg:hidden">
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">{headerExtra}</div>
            <ThemeToggle />
            <div className="flex items-center gap-2.5 rounded-pill bg-leaf-100/50 py-1 pl-1 pr-3.5">
              <span className="btn-glass grid h-9 w-9 place-items-center rounded-pill text-xs font-bold">{initials}</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-32 truncate text-sm font-semibold">{user.name}</span>
                <span className="block text-xs text-muted">{user.role}</span>
              </span>
            </div>
            <button onClick={onLogout} aria-label="Sair" title="Sair" className="grid h-10 w-10 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger">
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-8 pt-7 sm:px-5 lg:pr-6">
          {banner}
          <PageTransition>{children}</PageTransition>
        </main>

        <footer className="px-3 pb-3 sm:px-4 sm:pb-4 lg:pr-6">
          <div className="glass flex flex-wrap items-center justify-between gap-3 !rounded-pill px-6 py-3 text-xs text-muted">
            <span className="flex items-center gap-2">
              <Logo />
            </span>
            <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {footerLinks.map((l) => (
                <a key={l.label} href={l.href} className="transition hover:text-fg">
                  {l.label}
                </a>
              ))}
              <span>© {new Date().getFullYear()} Elo Digital</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
