'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, useAuth } from '@elo/client';
import type { PublicMenuView } from '@elo/core';
import { AuthLayout, Button, Field, Input, PasswordInput } from '@elo/ui';
import { homeOf } from '../_components/shell';

export default function Login() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, ready, setToken } = useAuth(slug);
  const [name, setName] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<PublicMenuView>(`/api/public/${slug}/menu`)
      .then((r) => setName(r.restaurant.name))
      .catch((e) => e instanceof ApiError && e.status === 404 && setMissing(true));
  }, [slug]);

  useEffect(() => {
    if (ready && user) router.replace(homeOf(slug, user.roles));
  }, [ready, user, slug, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ accessToken: string }>(`/api/auth/restaurants/${slug}/login`, { body: { username, password } });
      setToken(res.accessToken);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Usuário ou senha incorretos.' : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (missing)
    return (
      <AuthLayout brandSub="Equipe">
        <p className="text-sm text-muted">Este endereço não pertence a nenhum restaurante. Confira o link com o titular do restaurante.</p>
      </AuthLayout>
    );

  return (
    <AuthLayout brandSub="Equipe" title={name ?? undefined}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Usuário">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required autoFocus />
        </Field>
        <Field label="Senha">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button className="w-full !py-3.5" type="submit" loading={loading}>Entrar</Button>
      </form>
    </AuthLayout>
  );
}
