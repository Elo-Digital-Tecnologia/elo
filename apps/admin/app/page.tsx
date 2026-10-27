'use client';

import { KeyRound, ShieldCheck, Sprout, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, useAuth } from '@elo/client';
import { AuthLayout, Button, Field, FloatingGlass } from '@elo/ui';

type Mode = 'team' | 'superadmin';

export default function Login() {
  const router = useRouter();
  const { token, ready, setToken } = useAuth();
  const [mode, setMode] = useState<Mode>('team');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && token) router.replace('/overview');
  }, [ready, token, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'superadmin'
          ? await api<{ accessToken: string }>('/api/auth/superadmin', { body: { key: secret } })
          : await api<{ accessToken: string }>('/api/auth/login', { body: { username, password: secret } });
      setToken(res.accessToken);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Credenciais inválidas.' : 'Não foi possível entrar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      brandSub="Administração"
      headline="Cada restaurante no ar, cada assinatura em dia."
      lead="Cadastre restaurantes, registre pagamentos e controle o acesso de toda a plataforma."
      floating={
        <>
          <FloatingGlass className="left-0 top-2 w-64">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-pill bg-brand/15 text-brand"><Sprout size={20} /></span>
              <div className="text-sm"><div className="font-semibold">Casa Verde</div><div className="text-muted">Assinatura ativa</div></div>
            </div>
          </FloatingGlass>
          <FloatingGlass className="left-44 top-24 w-60" delay={1.2}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-pill bg-accent/60 text-accent-fg"><Users size={20} /></span>
              <div className="text-sm"><div className="font-semibold">Pagamento registrado</div><div className="text-muted">novo vencimento em 30 dias</div></div>
            </div>
          </FloatingGlass>
        </>
      }
    >
      <h2 className="text-2xl font-bold">Entrar</h2>
      <div className="glass my-5 inline-flex !rounded-pill p-1 text-sm font-semibold" role="tablist">
        {(['team', 'superadmin'] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }} className={`rounded-pill px-5 py-2 transition ${mode === m ? 'btn-glass' : 'text-muted hover:text-fg'}`}>
            {m === 'team' ? 'Equipe' : 'Superadmin'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'team' && <Field label="Usuário"><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></Field>}
        <Field label={mode === 'team' ? 'Senha' : 'Chave de superadmin'} hint={mode === 'superadmin' ? 'A chave fica nas variáveis de ambiente do servidor.' : undefined}>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button className="w-full !py-3.5" type="submit" loading={loading}>Entrar</Button>
      </form>
      <p className="mt-6 flex items-center gap-2 text-xs text-muted"><ShieldCheck size={14} className="text-brand" /> <KeyRound size={14} className="text-brand" /> Acesso restrito à equipe Elo Digital.</p>
    </AuthLayout>
  );
}
