'use client';

import { ChefHat, ConciergeBell, ShieldCheck, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, decodeToken, useAuth } from '@elo/client';
import { AuthLayout, Button, Field, FloatingGlass } from '@elo/ui';
import { HOME } from './_components/shell';

export default function Login() {
  const router = useRouter();
  const { token, ready, setToken } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = token ? decodeToken(token) : null;
    if (ready && user) router.replace(HOME[user.role] ?? '/dashboard');
  }, [ready, token, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ accessToken: string }>('/api/auth/login', { body: { username, password } });
      setToken(res.accessToken);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Usuário ou senha inválidos.' : 'Não foi possível entrar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      brandSub="Restaurante"
      headline="Salão, cozinha e caixa no mesmo ritmo."
      lead="Pedidos chegam à cozinha no instante em que o cliente envia, e o garçom sabe quem precisa dele."
      floating={
        <>
          <FloatingGlass className="left-0 top-2 w-64">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-pill bg-brand/15 text-brand"><ChefHat size={20} /></span>
              <div className="text-sm"><div className="font-semibold">Mesa 07 · Pizza Margherita</div><div className="text-muted">Em preparo</div></div>
            </div>
          </FloatingGlass>
          <FloatingGlass className="left-44 top-24 w-60" delay={1.2}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-pill bg-accent/60 text-accent-fg"><ConciergeBell size={20} /></span>
              <div className="text-sm"><div className="font-semibold">Mesa 03 chamou</div><div className="text-muted">há 20 segundos</div></div>
            </div>
          </FloatingGlass>
        </>
      }
    >
      <h2 className="text-2xl font-bold">Entrar</h2>
      <p className="mb-6 mt-1 text-sm text-muted">Use o usuário que o administrador do restaurante criou para você.</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Usuário">
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </Field>
        <Field label="Senha">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button className="w-full !py-3.5" type="submit" loading={loading}>Entrar</Button>
      </form>
      <ul className="mt-6 flex gap-5 text-xs text-muted">
        <li className="flex items-center gap-1.5"><Zap size={14} className="text-brand" /> Tempo real</li>
        <li className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand" /> Sessão protegida</li>
      </ul>
    </AuthLayout>
  );
}
