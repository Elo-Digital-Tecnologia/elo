/** Marca Elo: dois elos de corrente entrelaçados. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="2" y="12" width="22" height="16" rx="8" stroke="hsl(var(--elo-leaf-700))" strokeWidth="3.5" />
      <rect x="16" y="12" width="22" height="16" rx="8" stroke="hsl(var(--elo-brand))" strokeWidth="3.5" />
      <path d="M20 14.5c2 1.3 3 3.1 3 5.5s-1 4.2-3 5.5" stroke="hsl(var(--elo-lime))" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ sub }: { sub?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-none">
        <span className="font-display text-lg font-bold tracking-tight">elo</span>
        {sub && <span className="ml-1.5 inline-block max-w-[10rem] truncate align-bottom text-sm text-muted">{sub}</span>}
      </span>
    </span>
  );
}
