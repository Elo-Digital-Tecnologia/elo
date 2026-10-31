'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@elo/client';
import type { ReviewView } from '@elo/core';
import { Button } from '@elo/ui';

/** Avaliação do atendimento: de 1 a 5 estrelas e um comentário opcional. Pode ser corrigida enquanto a mesa estiver aberta. */
export function ReviewForm() {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<ReviewView | null>('/api/public/session/review')
      .then((r) => {
        if (r) {
          setStars(r.stars);
          setComment(r.comment ?? '');
          setSent(true);
        }
      })
      .catch(() => undefined);
  }, []);

  const send = async () => {
    setBusy(true);
    setError(false);
    try {
      await api('/api/public/session/review', { body: { stars, comment } });
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="surface space-y-3 p-4" aria-label="Avaliação do atendimento">
      <h2 className="font-semibold">{sent ? 'Obrigado pela avaliação' : 'Como foi o atendimento?'}</h2>
      <div role="radiogroup" aria-label="Nota de 1 a 5" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            onClick={() => {
              setStars(n);
              setSent(false);
            }}
            className="grid shrink-0 h-11 w-11 place-items-center rounded-pill transition active:scale-90 hover:bg-brand/10"
          >
            <Star size={28} className={n <= stars ? 'fill-accent text-accent' : 'text-line'} />
          </button>
        ))}
      </div>
      {stars > 0 && !sent && (
        <>
          <textarea rows={2} maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Quer comentar algo? (opcional)" aria-label="Comentário" />
          {error && <p role="alert" className="text-sm text-danger">Não foi possível enviar. Tente de novo.</p>}
          <Button className="w-full" loading={busy} onClick={send}>Enviar avaliação</Button>
        </>
      )}
    </section>
  );
}
