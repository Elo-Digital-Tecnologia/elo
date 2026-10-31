'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { FIELD_RULES, type ReviewView } from '@elo/core';
import { Button, Textarea } from '@elo/ui';
import { rule, unexpected, useForm } from '../../_lib/use-form';

const CHECKS = { comment: rule(FIELD_RULES.reviewComment) };

const ERRORS: Record<string, string> = {
  table_not_open: 'A avaliação fica disponível enquanto a mesa estiver aberta.',
};

/** Avaliação do atendimento: de 1 a 5 estrelas e um comentário opcional. Pode ser corrigida enquanto a mesa estiver aberta. */
export function ReviewForm() {
  const [stars, setStars] = useState(0);
  const form = useForm({ comment: '' }, CHECKS);
  const { set } = form;
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ReviewView | null>('/api/public/session/review')
      .then((r) => {
        if (r) {
          setStars(r.stars);
          set('comment', r.comment ?? '');
          setSent(true);
        }
      })
      .catch(() => undefined);
  }, [set]);

  const send = async () => {
    setError(null);
    if (!form.validate()) return;
    setBusy(true);
    try {
      await api('/api/public/session/review', { body: { stars, comment: form.values.comment } });
      setSent(true);
    } catch (err) {
      if (!form.fromServer(err)) setError((err instanceof ApiError && ERRORS[err.code]) || unexpected(err));
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
          <div>
            <Textarea {...form.bind('comment')} rows={2} maxLength={FIELD_RULES.reviewComment.max} placeholder="Quer comentar algo? (opcional)" aria-label="Comentário" />
            <span aria-live="polite" className="mt-1.5 block text-xs">
              {form.errors.comment ? <span className="text-danger">{form.errors.comment}</span> : <span className="text-muted">{form.values.comment.length}/{FIELD_RULES.reviewComment.max}</span>}
            </span>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button className="w-full" loading={busy} onClick={send}>Enviar avaliação</Button>
        </>
      )}
    </section>
  );
}
