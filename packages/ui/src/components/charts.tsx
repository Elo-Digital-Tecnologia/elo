'use client';

import { m as motion } from 'framer-motion';
import { useId, useState } from 'react';

/** Cores categóricas, em ordem fixa. Tokens validados em theme.css. */
export const CHART_COLORS = [1, 2, 3, 4, 5].map((n) => `hsl(var(--elo-chart-${n}))`);

export interface Datum {
  label: string;
  value: number;
}

const GRID = 'hsl(var(--elo-chart-grid))';

function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          <span className="text-muted">{i.label}</span>
          {i.value && <span className="font-semibold tabular-nums">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Sparkline sem eixos: só a forma da série. */
export function Sparkline({ data, className = '' }: { data: number[]; className?: string }) {
  const id = useId();
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 28 - ((v - min) / (max - min || 1)) * 24 - 2]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--elo-chart-1))" stopOpacity="0.35" />
          <stop offset="1" stopColor="hsl(var(--elo-chart-1))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100,30 L0,30 Z`} fill={`url(#${id})`} />
      <motion.path d={line} fill="none" stroke="hsl(var(--elo-chart-1))" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
    </svg>
  );
}

/** Área/linha de série única com cursor e tooltip. */
export function AreaChart({ data, format = String, height = 220, name = 'Valor' }: { data: Datum[]; format?: (n: number) => string; height?: number; name?: string }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const pad = { l: 8, r: 8, t: 14, b: 26 };
  const max = Math.max(...data.map((d) => d.value), 1);
  const x = (i: number) => pad.l + (i / Math.max(data.length - 1, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const step = Math.max(1, Math.ceil(data.length / 6));
  const h = hover === null ? null : data[hover];

  return (
    <div className="relative" role="img" aria-label={`${name}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--elo-chart-1))" stopOpacity="0.4" />
            <stop offset="1" stopColor="hsl(var(--elo-chart-1))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)} stroke={GRID} strokeWidth="1" />
        ))}
        <path d={`${line} L${x(data.length - 1)},${height - pad.b} L${x(0)},${height - pad.b} Z`} fill={`url(#${id})`} />
        <motion.path d={line} fill="none" stroke="hsl(var(--elo-chart-1))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
        {data.map((d, i) =>
          i % step === 0 ? (
            <text key={d.label} x={x(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="hsl(var(--elo-fg-muted))">
              {d.label}
            </text>
          ) : null,
        )}
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="hsl(var(--elo-fg-muted))" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.value)} r="5" fill="hsl(var(--elo-chart-1))" stroke="hsl(var(--elo-bg))" strokeWidth="2" />
          </g>
        )}
        {data.map((_, i) => (
          <rect key={i} x={x(i) - (W / data.length) / 2} y={0} width={W / data.length} height={height} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${data[i].label}: ${format(data[i].value)}`} />
        ))}
      </svg>
      {h && hover !== null && (
        <div className="glass pointer-events-none absolute -translate-x-1/2 -translate-y-full !rounded-md px-3 py-2 text-xs" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.value) / height) * 100}%`, marginTop: -10 }}>
          <div className="text-muted">{h.label}</div>
          <div className="font-semibold tabular-nums">{format(h.value)}</div>
        </div>
      )}
    </div>
  );
}

/** Barras horizontais ordenadas, com rótulo direto no valor. */
export function BarList({ data, format = String }: { data: Datum[]; format?: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate">{d.label}</span>
            <span className="font-semibold tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-pill bg-leaf-200/50">
            <motion.div
              className="h-full rounded-pill"
              style={{ background: 'hsl(var(--elo-chart-1))' }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.9, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Rosca de partes de um todo (máx. 5 fatias; cores em ordem fixa). */
export function Donut({ data, format = String, center }: { data: Datum[]; format?: (n: number) => string; center?: { value: string; label: string } }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const slices = data.map((d, i) => {
    const len = total ? (d.value / total) * C : 0;
    const gap = len > 4 ? 3 : 0;
    const s = { d, i, len: Math.max(len - gap, 0), offset };
    offset += len;
    return s;
  });
  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[220px]">
        <svg viewBox="0 0 140 140" className="-rotate-90" role="img" aria-label={data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}>
          <circle cx="70" cy="70" r={R} fill="none" stroke={GRID} strokeWidth="16" />
          {slices.map((s) => (
            <motion.circle
              key={s.d.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={CHART_COLORS[s.i % 5]}
              strokeWidth={hover === s.i ? 20 : 16}
              strokeLinecap="round"
              strokeDasharray={`${s.len} ${C}`}
              strokeDashoffset={-s.offset}
              initial={{ strokeDasharray: `0 ${C}` }}
              animate={{ strokeDasharray: `${s.len} ${C}` }}
              transition={{ duration: 1, delay: s.i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHover(s.i)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: 'stroke-width 160ms' }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-3xl font-bold tabular-nums">{hover !== null ? format(data[hover].value) : center?.value ?? format(total)}</div>
            <div className="text-xs text-muted">{hover !== null ? data[hover].label : center?.label ?? 'Total'}</div>
          </div>
        </div>
      </div>
      <Legend items={data.map((d, i) => ({ label: d.label, color: CHART_COLORS[i % 5], value: format(d.value) }))} />
    </div>
  );
}

/** Colunas verticais para poucos períodos. */
export function ColumnChart({ data, format = String, height = 200 }: { data: Datum[]; format?: (n: number) => string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    // The top padding keeps the value shown on hover inside the chart, clear of the title above it.
    <div role="img" aria-label={data.map((d) => `${d.label} ${format(d.value)}`).join(', ')} className="pt-8">
      <div className={`flex items-end ${data.length > 12 ? 'gap-0.5 sm:gap-1.5' : 'gap-2'}`} style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="relative flex h-full min-w-0 flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && <div className="glass pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap !rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums">{format(d.value)}</div>}
            <motion.div
              className="w-full rounded-t-md"
              style={{ background: 'hsl(var(--elo-chart-1))', opacity: hover === null || hover === i ? 1 : 0.55 }}
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        ))}
      </div>
      <div className={`mt-2 flex text-[10px] text-muted sm:text-xs ${data.length > 12 ? 'gap-0.5 sm:gap-1.5' : 'gap-2'}`}>
        {data.map((d, i) => (
          <span key={d.label} className={`min-w-0 flex-1 overflow-hidden text-center ${data.length > 12 && i % 2 ? 'max-sm:invisible' : ''}`}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
