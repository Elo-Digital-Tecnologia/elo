'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, useAuth } from '@elo/client';
import { AuthLayout, Button, Field, Input, PasswordInput } from '@elo/ui';

type Mode = 'team' | 'superadmin';

export default function Login() {
  const router = useRouter();
  const { token, ready, setToken } = useAuth('admin');
  const [mode, setMode] = useState<Mode>('team');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && token) router.replace('/admin/overview');
  }, [ready, token, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'superadmin'
          ? await api<{ accessToken: string }>('/api/auth/superadmin', { body: { key: secret } })
          : await api<{ accessToken: string }>('/api/auth/team/login', { body: { username, password: secret } });
      setToken(res.accessToken);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Credenciais incorretas.' : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout brandSub="Administração">
      <div className="glass inline-flex !rounded-pill p-1 text-sm font-semibold" role="tablist">
        {(['team', 'superadmin'] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }} className={`rounded-pill px-5 py-2 transition ${mode === m ? 'btn-glass' : 'text-muted hover:text-fg'}`}>
            {m === 'team' ? 'Equipe' : 'Superadmin'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'team' && (
          <Field label="Usuário">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
          </Field>
        )}
        <Field label={mode === 'team' ? 'Senha' : 'Chave de superadmin'}>
          <PasswordInput value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button className="w-full !py-3.5" type="submit" loading={loading}>Entrar</Button>
      </form>
    </AuthLayout>
  );
}
