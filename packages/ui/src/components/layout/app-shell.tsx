'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { ChevronsLeft, ExternalLink, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUiTexts } from '../../texts/ui-texts';
import { MOTION_SPRINGS } from '../../theme/motion';
import { ThemeToggle } from '../../theme/theme';
import { Logo, LogoMark } from '../brand/logo';
import { Avatar } from '../data/avatar';
import { Aurora } from '../motion/aurora';
import { PageTransition } from '../motion/motion';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    /** Contador opcional (ex.: chamados pendentes). */
    badge?: number;
    /** Opens in a new tab, outside the panel. */
    external?: boolean;
}

interface Props {
    brandSub: string;
    nav: NavItem[];
    /** Who is signed in. */
    user: { name: string; role: string; avatarUrl?: string | null };
    onLogout: () => void;
    /** Node at the left of the actions header (indicators, live status...). */
    headerExtra?: ReactNode;
    /** Shortcuts below the menu, like the guests' menu or the API docs. */
    links?: NavItem[];
    defaultCollapsed?: boolean;
    /** Strip above the content (due date warning). */
    banner?: ReactNode;
    children: ReactNode;
}

const COLLAPSE_KEY = 'elo.sidebar';

function NavList({
    nav,
    collapsed,
    onNavigate,
    group = 'side'
}: {
    nav: NavItem[];
    collapsed: boolean;
    onNavigate?: () => void;
    group?: string;
}) {
    const t = useUiTexts();
    const path = usePathname();
    // Only the most specific item is marked (/dashboard does not light up on /dashboard/menu).
    const current = nav
        .filter((i) => path === i.href || path.startsWith(`${i.href}/`))
        .sort((x, y) => y.href.length - x.href.length)[0]?.href;
    return (
        <nav aria-label={t.mainNavigation} className="flex flex-col gap-1.5">
            {nav.map((item) => {
                const active = !item.external && item.href === current;
                const Icon = item.icon;
                if (item.external)
                    return (
                        <a
                            key={item.href}
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            title={collapsed ? item.label : undefined}
                            className={`group relative flex items-center gap-3 rounded-pill px-3.5 py-3 text-sm font-medium text-muted transition-colors hover:bg-brand/10 hover:text-fg ${collapsed ? 'justify-center' : ''}`}
                        >
                            <Icon size={20} />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                            {!collapsed && (
                                <ExternalLink
                                    size={14}
                                    className="ml-auto shrink-0 opacity-60"
                                    aria-label={t.opensInNewTab}
                                />
                            )}
                        </a>
                    );
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
                                layoutId={`nav-active-${group}`}
                                className="btn-glass absolute inset-0 -z-10 rounded-pill"
                                transition={{
                                    ...MOTION_SPRINGS.navigation
                                }}
                            />
                        )}
                        {!active && (
                            <span className="absolute inset-0 -z-10 rounded-pill bg-brand/0 transition group-hover:bg-brand/10" />
                        )}
                        <Icon size={20} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!!item.badge && (
                            <span
                                className={`${collapsed ? 'absolute right-1 top-1' : 'ml-auto'} grid min-w-5 place-items-center rounded-pill bg-accent px-1.5 text-xs font-bold text-accent-fg`}
                            >
                                {item.badge}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}

/** Scrolling menu that blurs its top or bottom edge while there is more to see that way. */
function FadingScroll({ children }: { children: ReactNode }) {
    const box = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ top: false, bottom: false });
    const update = useCallback(() => {
        const el = box.current;
        if (!el) return;
        setEdges({
            top: el.scrollTop > 2,
            bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 2
        });
    }, []);
    useEffect(() => {
        const el = box.current;
        if (!el) return;
        update();
        const watch = new ResizeObserver(update);
        watch.observe(el);
        if (el.firstElementChild) watch.observe(el.firstElementChild);
        return () => watch.disconnect();
    }, [update]);
    const edge =
        'pointer-events-none absolute inset-x-0 z-10 h-12 backdrop-blur-[3px] transition-opacity duration-300';
    return (
        <div className="relative mt-3 min-h-0 flex-1">
            <div
                ref={box}
                onScroll={update}
                className="h-full overflow-y-auto overscroll-contain scroll-soft"
            >
                <div>{children}</div>
            </div>
            <span
                aria-hidden
                className={`${edge} top-0 [mask-image:linear-gradient(to_bottom,black,transparent)] ${edges.top ? 'opacity-100' : 'opacity-0'}`}
            />
            <span
                aria-hidden
                className={`${edge} bottom-0 [mask-image:linear-gradient(to_top,black,transparent)] ${edges.bottom ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
}

/** Application shell: aurora, collapsible sidebar (drawer on mobile) and header. Stays mounted between tabs. */
export function AppShell({
    brandSub,
    nav,
    user,
    onLogout,
    headerExtra,
    links = [],
    defaultCollapsed = false,
    banner,
    children
}: Props) {
    const t = useUiTexts();
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [drawer, setDrawer] = useState(false);
    const [account, setAccount] = useState(false);
    const path = usePathname();

    useEffect(() => {
        try {
            const saved = localStorage.getItem(COLLAPSE_KEY);
            if (saved !== null) setCollapsed(saved === '1');
        } catch {
            /* storage unavailable */
        }
    }, []);

    useEffect(() => {
        setDrawer(false);
        setAccount(false);
    }, [path]);

    useEffect(() => {
        if (!account) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAccount(false);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [account]);

    // Menu open on a phone: the page behind does not scroll.
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
                /* storage unavailable */
            }
            return !c;
        });

    return (
        <div className="min-h-dvh">
            <Aurora />

            {/* Sidebar desktop */}
            <aside
                className="glass glass-strong fixed bottom-4 left-4 top-4 z-30 hidden flex-col p-3 transition-[width] duration-500 ease-elo lg:flex"
                style={{ width: collapsed ? 88 : 272 }}
            >
                <div
                    className={`flex items-center px-2 py-3 ${collapsed ? 'justify-center' : ''}`}
                >
                    {collapsed ? <LogoMark /> : <Logo sub={brandSub} />}
                </div>
                <FadingScroll>
                    <NavList nav={nav} collapsed={collapsed} />
                    {links.length > 0 && (
                        <div className="mt-3 border-t border-line/40 pt-3">
                            <NavList nav={links} collapsed={collapsed} />
                        </div>
                    )}
                </FadingScroll>
                <button
                    onClick={toggleCollapsed}
                    aria-label={collapsed ? t.expandSidebar : t.collapseSidebar}
                    className="mt-2 flex items-center justify-center gap-2 rounded-pill py-2.5 text-sm text-muted transition hover:bg-brand/10 hover:text-fg"
                >
                    <ChevronsLeft
                        size={18}
                        className={`transition-transform duration-500 ${collapsed ? 'rotate-180' : ''}`}
                    />
                    {!collapsed && t.collapse}
                </button>
            </aside>

            {/*
        Drawer mobile. Always mounted and moved with CSS: an exit animation that never
        finished (navigation happens while it plays) used to leave an invisible layer
        over the page, blocking taps and scrolling until a reload.
      */}
            <div
                className={`fixed inset-x-0 top-0 z-50 h-dvh transition-[opacity,visibility] duration-300 lg:hidden ${drawer ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'}`}
                aria-hidden={!drawer}
            >
                <div
                    className="modal-backdrop absolute inset-0 bg-leaf-900/40 backdrop-blur-md"
                    onClick={() => setDrawer(false)}
                    aria-hidden
                />
                <aside
                    className={`glass glass-strong absolute bottom-3 left-3 top-3 flex w-[min(300px,calc(100%-24px))] flex-col overflow-hidden p-3 transition-transform duration-300 ease-elo ${drawer ? 'translate-x-0' : '-translate-x-[calc(100%+24px)]'}`}
                >
                    <div className="flex items-center justify-between px-2 py-3">
                        <Logo sub={brandSub} />
                        <button
                            onClick={() => setDrawer(false)}
                            aria-label={t.closeMenu}
                            className="grid shrink-0 h-9 w-9 place-items-center rounded-pill bg-leaf-100/60"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <FadingScroll>
                        <NavList
                            nav={nav}
                            collapsed={false}
                            onNavigate={() => setDrawer(false)}
                            group="drawer"
                        />
                        {links.length > 0 && (
                            <div className="mt-3 border-t border-line/40 pt-3">
                                <NavList nav={links} collapsed={false} />
                            </div>
                        )}
                    </FadingScroll>
                </aside>
            </div>

            {/* Coluna principal */}
            <div
                className="flex min-h-dvh min-w-0 flex-col transition-[padding] duration-500 ease-elo lg:pl-[var(--shell-pad)]"
                style={{ ['--shell-pad' as string]: `${(collapsed ? 88 : 272) + 32}px` }}
            >
                <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4 sm:pt-4 lg:pr-6">
                    <div className="glass glass-strong flex items-center gap-2 !rounded-pill py-2 pl-2.5 pr-2 sm:gap-3 sm:pl-3 sm:pr-2.5">
                        <button
                            onClick={() => setDrawer(true)}
                            aria-label={t.openMenu}
                            className="grid shrink-0 h-10 w-10 place-items-center rounded-pill transition hover:bg-brand/10 lg:hidden"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="hidden sm:block lg:hidden">
                            <Logo />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                            {headerExtra}
                        </div>
                        <div className="hidden sm:block">
                            <ThemeToggle />
                        </div>
                        <div className="flex items-center gap-2.5 rounded-pill py-1 pl-1 sm:bg-leaf-100/50 sm:pr-3.5">
                            {/* On phones the avatar opens the account menu; theme and sign out live there. */}
                            <button
                                onClick={() => setAccount((a) => !a)}
                                aria-expanded={account}
                                aria-label={t.account}
                                className="rounded-pill sm:pointer-events-none"
                            >
                                <Avatar name={user.name} url={user.avatarUrl} />
                            </button>
                            <span className="hidden text-left leading-tight sm:block">
                                <span className="block max-w-32 truncate text-sm font-semibold">
                                    {user.name}
                                </span>
                                <span className="block text-xs text-muted">
                                    {user.role}
                                </span>
                            </span>
                        </div>
                        <button
                            onClick={onLogout}
                            aria-label={t.signOut}
                            title={t.signOut}
                            className="hidden h-10 w-10 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger sm:grid"
                        >
                            <LogOut size={19} />
                        </button>
                    </div>
                    {/* The backdrop leaves at once; only the card fades out, so nothing can stay over the page. */}
                    {account && (
                        <div
                            className="fixed inset-0 z-10 sm:hidden"
                            onClick={() => setAccount(false)}
                            aria-hidden
                        />
                    )}
                    <AnimatePresence>
                        {account && (
                            <motion.div
                                role="dialog"
                                aria-label={t.account}
                                className="glass glass-strong absolute right-3 top-full z-20 mt-2 w-64 space-y-3 p-4 sm:hidden"
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                            >
                                <div className="min-w-0 leading-tight">
                                    <span className="block truncate font-semibold">
                                        {user.name}
                                    </span>
                                    <span className="block text-xs text-muted">
                                        {user.role}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted">
                                    {t.theme}
                                    <ThemeToggle />
                                </div>
                                <button
                                    onClick={onLogout}
                                    className="flex w-full items-center gap-2 rounded-pill px-3 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
                                >
                                    <LogOut size={17} /> Sair
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </header>

                <main className="min-w-0 flex-1 px-4 pb-8 pt-7 sm:px-5 lg:pr-6">
                    {banner}
                    <PageTransition>{children}</PageTransition>
                </main>
            </div>
        </div>
    );
}
