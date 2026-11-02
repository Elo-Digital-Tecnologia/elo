'use client';

import { ExternalLink, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

const keyOf = (slug: string) => `elo.google.${slug}`;

/**
 * Invitation to review the restaurant on Google. Once the guest taps it, this device
 * stops showing it; nothing about the tap leaves the device. The guest may read it
 * after any rating: inviting only the satisfied ones is against Google's rules.
 */
export function GoogleReviewLink({ url, slug, variant = 'button', children }: { url: string | null; slug: string; variant?: 'button' | 'link'; children: React.ReactNode }) {
  const [done, setDone] = useState(true);
  useEffect(() => {
    try {
      setDone(localStorage.getItem(keyOf(slug)) === '1');
    } catch {
      setDone(false);
    }
  }, [slug]);
  if (!url || done) return null;

  const tapped = () => {
    try {
      localStorage.setItem(keyOf(slug), '1');
    } catch {
      /* storage indisponível: o convite pode voltar */
    }
    setDone(true);
  };

  return variant === 'button' ? (
    <a href={url} target="_blank" rel="noreferrer noopener" onClick={tapped} className="btn-glass inline-flex w-full items-center justify-center gap-2 rounded-pill px-5 py-3 text-sm font-semibold">
      <Star size={16} aria-hidden /> {children}
    </a>
  ) : (
    <a href={url} target="_blank" rel="noreferrer noopener" onClick={tapped} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-2 hover:underline">
      {children} <ExternalLink size={14} aria-hidden />
    </a>
  );
}
