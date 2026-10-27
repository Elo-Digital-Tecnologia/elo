type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-leaf-100/70 text-fg',
  brand: 'bg-brand/15 text-brand',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/18 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
};

export function Badge({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
