/** A team member's photo, or their initials when there is none. */
export function Avatar({ name, url, size = 36, className = '' }: { name: string; url?: string | null; size?: number; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-pill bg-brand/15 font-bold text-brand ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" /> : initials}
    </span>
  );
}
