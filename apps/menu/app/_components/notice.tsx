import { Aurora, GlassCard, Logo } from '@elo/ui';

export function Notice({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center p-4">
      <Aurora />
      <GlassCard strong className="w-full max-w-md space-y-4 p-8 text-center">
        <div className="flex justify-center"><Logo /></div>
        {icon && <div className="mx-auto grid h-16 w-16 place-items-center rounded-pill bg-brand/15 text-brand">{icon}</div>}
        <h1 className="text-2xl font-bold">{title}</h1>
        {children && <p className="text-muted">{children}</p>}
      </GlassCard>
    </main>
  );
}
