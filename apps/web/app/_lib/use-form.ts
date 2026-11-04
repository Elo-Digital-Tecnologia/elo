'use client';

import type { FieldError, FieldErrorCode, FieldRule } from '@elo/core/fields/field-rules';
import { ApiError } from '@elo/client/http/api-error';
import { HTTP_STATUS } from '@elo/client/http/http-status';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { fieldError, moneyError } from '@elo/core/fields/field-rules';
import { useCallback, useMemo, useState } from 'react';
import { GENERIC_MESSAGES } from '#/_lib/messages/errors';
import { fieldMessage } from '#/_lib/messages/fields';

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

/** What field codes and API error codes mean on a given form. */
export type FormMessages<C extends string = never> = Partial<
    Record<FieldErrorCode | ApiErrorCode | C, string>
>;

/** An error under a field: a validation problem, or an API error about that field. */
type FormError = FieldError | { code: ApiErrorCode | string };

const isFieldError = (e: FormError): e is FieldError => typeof e.code === 'string';

/**
 * Some API codes about a field share their meaning with a field code
 * (`ApiErrorCode.INVALID_SLUG` and `invalid_slug`), so they reuse its message.
 */
const defaultMessage = (e: FormError): string => {
    if (isFieldError(e)) return fieldMessage(e);
    const name = ApiErrorCode[e.code as ApiErrorCode]?.toLowerCase();
    return name
        ? fieldMessage({ code: name as FieldErrorCode })
        : GENERIC_MESSAGES.invalidValue;
};

/**
 * Form state with live validation using the same rules as the API. A field shows
 * its error once the person leaves it (or tries to submit) and keeps it in sync
 * while they fix it; errors sent back by the API land on their own field.
 *
 * `messages` names what codes from the server mean here (`ApiErrorCode.USERNAME_TAKEN`).
 */
/**
 * `C` names extra codes produced by the form's own checks (`start_missing`), so a typo in
 * `messages` is still caught.
 */
export function useForm<V extends object, C extends string = never>(
    initial: V,
    checks: { [K in keyof V]?: Check<V> },
    messages: FormMessages<NoInfer<C>> = {}
) {
    const [values, setValues] = useState<V>(initial);
    const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
    const [server, setServer] = useState<Partial<Record<keyof V, FormError>>>({});

    const live = useCallback(
        (k: keyof V, all: V) =>
            (checks[k] as ((v: unknown, a: V) => FieldError | null) | undefined)?.(
                all[k],
                all
            ) ?? null,
        [checks]
    );

    const errors = useMemo(() => {
        const out: Partial<Record<keyof V, string>> = {};
        for (const k of Object.keys(values) as (keyof V)[]) {
            if (!touched[k] && !submitted && !server[k]) continue;
            const e = live(k, values) ?? server[k];
            if (e)
                out[k] = messages[e.code as keyof typeof messages] ?? defaultMessage(e);
        }
        return out;
    }, [values, touched, submitted, server, live, messages]);

    const set = useCallback(<K extends keyof V>(k: K, v: V[K]) => {
        setValues((all) => ({ ...all, [k]: v }));
        setServer((s) => (s[k] ? { ...s, [k]: undefined } : s));
    }, []);

    const touch = useCallback(
        (k: keyof V) => setTouched((t) => (t[k] ? t : { ...t, [k]: true })),
        []
    );

    /** Props for a text control: value, change, blur, `invalid` and the `name` used to focus it. */
    const bind = (k: Keys<V>) => ({
        name: k,
        value: (values[k] ?? '') as string,
        onChange: (e: { target: { value: string } }) =>
            set(k, e.target.value as V[typeof k]),
        onBlur: () => touch(k),
        invalid: !!errors[k]
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
        const next: Partial<Record<keyof V, FormError>> = {};
        for (const [path, e] of Object.entries(err.fields)) {
            const key = map[path] ?? (path in values ? (path as Keys<V>) : undefined);
            if (key && !next[key]) next[key] = e;
        }
        if (err.field) {
            const key =
                map[err.field] ??
                (err.field in values ? (err.field as Keys<V>) : undefined);
            if (key) next[key] = { code: err.code };
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
    if (err instanceof ApiError)
        return err.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR
            ? GENERIC_MESSAGES.serverFailure
            : GENERIC_MESSAGES.requestFailure;
    return GENERIC_MESSAGES.connectionFailure;
}
