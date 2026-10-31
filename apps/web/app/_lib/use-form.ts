'use client';

import { useCallback, useMemo, useState } from 'react';
import { ApiError } from '@elo/client';
import { type FieldError, fieldError, fieldMessage, type FieldRule, moneyError } from '@elo/core';

/** Checks one value (with the whole form at hand, for fields that depend on others). */
export type Check<V> = (value: never, all: V) => FieldError | null;

/** A rule from `@elo/core` as a form check. */
export const rule =
  (r: FieldRule) =>
  (value: unknown): FieldError | null =>
    fieldError(r, value);

/** Money typed as text ("39,90") checked with a cents rule from `@elo/core`. */
export const money =
  (r: FieldRule) =>
  (value: string): FieldError | null =>
    moneyError(r, value);

type Keys<V> = Extract<keyof V, string>;

/**
 * Form state with live validation using the same rules as the API. A field shows
 * its error once the person leaves it (or tries to submit) and keeps it in sync
 * while they fix it; errors sent back by the API land on their own field.
 *
 * `messages` names what codes from the server mean here (`username_taken`).
 */
export function useForm<V extends object>(initial: V, checks: { [K in keyof V]?: Check<V> }, messages: Record<string, string> = {}) {
  const [values, setValues] = useState<V>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<Partial<Record<keyof V, FieldError>>>({});

  const live = useCallback((k: keyof V, all: V) => (checks[k] as ((v: unknown, a: V) => FieldError | null) | undefined)?.(all[k], all) ?? null, [checks]);

  const errors = useMemo(() => {
    const out: Partial<Record<keyof V, string>> = {};
    for (const k of Object.keys(values) as (keyof V)[]) {
      if (!touched[k] && !submitted && !server[k]) continue;
      const e = live(k, values) ?? server[k];
      if (e) out[k] = messages[e.code] ?? fieldMessage(e);
    }
    return out;
  }, [values, touched, submitted, server, live, messages]);

  const set = useCallback(<K extends keyof V>(k: K, v: V[K]) => {
    setValues((all) => ({ ...all, [k]: v }));
    setServer((s) => (s[k] ? { ...s, [k]: undefined } : s));
  }, []);

  const touch = useCallback((k: keyof V) => setTouched((t) => (t[k] ? t : { ...t, [k]: true })), []);

  /** Props for a text control: value, change, blur, `invalid` and the `name` used to focus it. */
  const bind = (k: Keys<V>) => ({
    name: k,
    value: (values[k] ?? '') as string,
    onChange: (e: { target: { value: string } }) => set(k, e.target.value as V[typeof k]),
    onBlur: () => touch(k),
    invalid: !!errors[k],
  });

  /** Checks everything before sending; on a problem, focuses the first field with it. */
  const validate = () => {
    setSubmitted(true);
    const bad = (Object.keys(values) as Keys<V>[]).find((k) => live(k, values));
    if (bad) {
      document.querySelector<HTMLElement>(`[name="${bad}"]`)?.focus();
      return false;
    }
    return true;
  };

  /**
   * Puts the API's per-field errors under their fields. `map` renames API paths
   * to form keys (`adminUsername` → `username`). Returns whether any landed.
   */
  const fromServer = (err: unknown, map: Record<string, Keys<V>> = {}) => {
    if (!(err instanceof ApiError)) return false;
    const next: Partial<Record<keyof V, FieldError>> = {};
    for (const [path, e] of Object.entries(err.fields)) {
      const key = map[path] ?? (path in values ? (path as Keys<V>) : undefined);
      if (key && !next[key]) next[key] = e as FieldError;
    }
    if (err.field) {
      const key = map[err.field] ?? (err.field in values ? (err.field as Keys<V>) : undefined);
      if (key) next[key] = { code: err.code as FieldError['code'] };
    }
    if (!Object.keys(next).length) return false;
    setServer(next);
    document.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
    return true;
  };

  const reset = (v: V) => {
    setValues(v);
    setTouched({});
    setSubmitted(false);
    setServer({});
  };

  return { values, set, touch, bind, errors, validate, fromServer, reset, setValues };
}

/** Message for an unexpected failure, when no field or known code explains it. */
export function unexpected(err: unknown): string {
  if (err instanceof ApiError) return err.status >= 500 ? 'O servidor não conseguiu concluir agora. Tente de novo em instantes.' : 'Não foi possível concluir. Tente de novo.';
  return 'Falha de conexão. Confira a internet e tente de novo.';
}
