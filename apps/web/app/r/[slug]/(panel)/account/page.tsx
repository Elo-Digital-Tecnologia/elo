'use client';

import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@elo/client';
import { Button, Field, GlassCard, PageHeader } from '@elo/ui';
import { Shell, useStaff } from '../_components/shell';

function Account() {
  const { token } = useStaff();
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.again) return setMsg({ ok: false, text: 'A confirmação não confere com a nova senha.' });
    setLoading(true);
    setMsg(null);
    try {
      await api('/api/me/password', { method: 'PATCH', body: { current: form.current, next: form.next }, token });
      setForm({ current: '', next: '', again: '' });
      setMsg({ ok: true, text: 'Senha alterada.' });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof ApiError && err.status === 401 ? 'A senha atual está incorreta.' : err instanceof ApiError && err.code === 'same_password' ? 'Escolha uma senha diferente da atual.' : 'Não foi possível alterar. A nova senha precisa ter 8+ caracteres.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Minha conta" description="Se esqueceu a senha, peça ao administrador para redefinir." />
      <GlassCard strong className="max-w-md p-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Senha atual"><input type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required /></Field>
          <Field label="Nova senha" hint="Pelo menos 8 caracteres."><input type="password" autoComplete="new-password" minLength={8} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required /></Field>
          <Field label="Repita a nova senha"><input type="password" autoComplete="new-password" minLength={8} value={form.again} onChange={(e) => setForm({ ...form, again: e.target.value })} required /></Field>
          {msg && <p role="alert" className={`text-sm ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}
          <Button type="submit" loading={loading}><KeyRound size={16} /> Alterar senha</Button>
        </form>
      </GlassCard>
    </>
  );
}

export default function AccountPage() {
  return (
    <Shell roles={['restaurant_admin', 'waiter', 'kitchen', 'cashier']}>
      <Account />
    </Shell>
  );
}
