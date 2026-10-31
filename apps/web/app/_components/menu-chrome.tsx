import { Logo } from '@elo/ui';

/** Rodapé simples do cardápio público. */
export function MenuFooter({ name }: { name: string }) {
  return (
    <footer className="mt-4 flex flex-col items-center gap-2 border-t border-line/40 pt-6 text-center text-sm text-muted">
      <span className="font-semibold text-fg">{name}</span>
      <span className="flex items-center gap-2">Feito com <Logo /></span>
    </footer>
  );
}
