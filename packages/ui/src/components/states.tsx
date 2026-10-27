import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';
import { GlassCard } from './glass-card';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Carregamento de lista/cartões. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Carregando">
      {Array.from({ length: count }, (_, i) => (
        <GlassCard key={i} className="space-y-3 p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </GlassCard>
      ))}
    </div>
  );
}

/** Estado vazio: explica e convida a agir. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <GlassCard className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-pill bg-brand/15 text-brand">
        <Icon size={26} />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
      {action}
    </GlassCard>
  );
}

export function ErrorState({ title = 'Não foi possível carregar', children, action }: { title?: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <GlassCard className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
      <span className="grid h-14 w-14 place-items-center rounded-pill bg-danger/15 text-danger">
        <AlertTriangle size={26} />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
      {action}
    </GlassCard>
  );
}
