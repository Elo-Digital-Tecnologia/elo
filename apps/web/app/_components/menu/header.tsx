import type { ReactNode } from 'react';
import { LogoMark, ThemeToggle } from '@elo/ui';

/**
 * Topo do cardápio. Logo e nome ficam dentro da capa, então nada invade o conteúdo
 * abaixo. Sem imagem, a capa usa o degradê verde do tema com a marca ao fundo.
 */
export function MenuHeader({
  name,
  coverUrl,
  logoUrl,
  action,
  children,
}: {
  name: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  /** Botão extra no canto da capa (ex.: chamar o garçom). */
  action?: ReactNode;
  /** Linha sob a capa: situação da mesa, aviso de consulta etc. */
  children?: ReactNode;
}) {
  return (
    <header>
      <div className="cover-fallback relative isolate h-44 overflow-hidden sm:h-56">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span aria-hidden className="absolute -right-10 -top-10 h-56 w-56 rounded-full border border-white/20" />
            <span aria-hidden className="absolute -right-2 top-14 h-32 w-32 rounded-full border border-white/15" />
            <span aria-hidden className="absolute -bottom-6 right-6 text-white opacity-[0.14]"><LogoMark size={150} /></span>
          </>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-end gap-2 p-3">
          {action}
          <ThemeToggle className="!h-10 !w-10" />
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 p-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white/90 bg-brand text-2xl font-extrabold text-brand-fg shadow-lg">
            {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <span aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>}
          </div>
          <h1 className="min-w-0 break-words font-display text-2xl font-extrabold leading-tight text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.45)] sm:text-3xl">{name}</h1>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pt-3 text-sm text-muted">{children}</div>}
    </header>
  );
}
