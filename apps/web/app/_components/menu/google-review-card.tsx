'use client';

import { ExternalLink, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const tappedKey = (slug: string) => `elo.google.${slug}`;
const laterKey = (slug: string) => `elo.google.later.${slug}`;

const read = (store: () => Storage, key: string) => {
  try {
    return store().getItem(key) === '1';
  } catch {
    return false;
  }
};

const write = (store: () => Storage, key: string) => {
  try {
    store().setItem(key, '1');
  } catch {
    /* storage indisponível: o convite pode voltar */
  }
};

/** The Google "G" in the brand's own colors, the one place outside the theme tokens. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * Invitation to review the restaurant on Google. Tapping it hides it on this device for
 * good, "Agora não" only for this visit; nothing about either leaves the device. It is
 * shown after any rating: inviting only the satisfied guests is against Google's rules.
 */
export function GoogleReviewCard({ url, slug, name, thanks = false, dismissible = false }: { url: string | null; slug: string; name: string; thanks?: boolean; dismissible?: boolean }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => setHidden(read(() => localStorage, tappedKey(slug)) || read(() => sessionStorage, laterKey(slug))), [slug]);
  if (!url || hidden) return null;

  return (
    <section aria-label="Avaliação no Google" className="surface relative space-y-3 border-2 border-accent/60 p-4">
      {dismissible && (
        <button
          type="button"
          aria-label="Agora não"
          onClick={() => {
            write(() => sessionStorage, laterKey(slug));
            setHidden(true);
          }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-fg"
        >
          <X size={16} aria-hidden />
        </button>
      )}
      <div className="flex items-center gap-3 pr-8">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-white shadow-sm"><GoogleMark /></span>
        <div className="min-w-0">
          <h2 className="font-semibold leading-tight">{thanks ? 'Obrigado! Conte também no Google' : `Avalie o ${name} no Google`}</h2>
          <span className="mt-1 flex gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} className="fill-accent text-accent" />)}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted">Sua avaliação no Google Maps ajuda outras pessoas a nos encontrar. Leva menos de um minuto.</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={() => {
          write(() => localStorage, tappedKey(slug));
          setHidden(true);
        }}
        className="btn-glass inline-flex w-full items-center justify-center gap-2 rounded-pill px-5 py-3 text-sm font-semibold"
      >
        Avaliar no Google <ExternalLink size={15} aria-hidden />
      </a>
    </section>
  );
}
