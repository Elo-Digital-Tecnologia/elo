'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, useAuth } from '@elo/client';
import { AuthLayout, Button, Field, Input, PasswordInput } from '@elo/ui';
import { unexpected, useForm } from '../_lib/use-form';

type Mode = 'team' | 'superadmin';

const REQUIRED = { code: 'required' } as const;

export default function Login() {
  const router = useRouter();
  const { token, ready, setToken } = useAuth('admin');
  const [mode, setMode] = useState<Mode>('team');
  /** Sign-in only checks that something was typed: it never hints at the password rules. */
  const form = useForm(
    { username: '', secret: '' },
    {
      username: (v: string) => (mode === 'team' && !v.trim() ? REQUIRED : null),
      secret: (v: string) => (v ? null : REQUIRED),
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && token) router.replace('/admin/overview');
  }, [ready, token, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.validate()) return;
    const { username, secret } = form.values;
    setLoading(true);
    try {
      const res =
        mode === 'superadmin'
          ? await api<{ accessToken: string }>('/api/auth/superadmin', { body: { key: secret } })
          : await api<{ accessToken: string }>('/api/auth/team/login', { body: { username, password: secret } });
      setToken(res.accessToken);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? mode === 'team' ? 'Usuário ou senha incorretos.' : 'Chave de superadmin incorreta.'
          : err instanceof ApiError && err.status === 429
            ? 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
            : unexpected(err),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout brandSub="Administração">
      <div className="glass inline-flex !rounded-pill p-1 text-sm font-semibold" role="tablist">
        {(['team', 'superadmin'] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); form.reset(form.values); }} className={`rounded-pill px-5 py-2 transition ${mode === m ? 'btn-glass' : 'text-muted hover:text-fg'}`}>
            {m === 'team' ? 'Equipe' : 'Superadmin'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        {mode === 'team' && (
          <Field label="Usuário" error={form.errors.username}>
            <Input {...form.bind('username')} autoComplete="username" autoCapitalize="none" />
          </Field>
        )}
        <Field label={mode === 'team' ? 'Senha' : 'Chave de superadmin'} error={form.errors.secret}>
          <PasswordInput {...form.bind('secret')} autoComplete="current-password" />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button className="w-full !py-3.5" type="submit" loading={loading}>Entrar</Button>
      </form>
    </AuthLayout>
  );
}
