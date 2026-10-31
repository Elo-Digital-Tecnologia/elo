import { Logo, ThemeToggle } from '@elo/ui';

/** Aviso de tela cheia: link inválido, mesa em uso, atendimento encerrado, erro. */
export function Notice({ title, children, icon, action }: { title: string; children?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center px-6 py-10">
      <div className="absolute right-3 top-3"><ThemeToggle className="!h-10 !w-10" /></div>
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="flex justify-center"><Logo /></div>
        {icon && <div className="mx-auto grid shrink-0 h-16 w-16 place-items-center rounded-pill bg-brand/12 text-brand">{icon}</div>}
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        {children && <p className="text-muted">{children}</p>}
        {action}
      </div>
    </main>
  );
}
