'use client';

import { KeyRound } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { FIELD_RULES, type FieldError } from '@elo/core';
import { Button, Field, GlassCard, PageHeader, PasswordInput } from '@elo/ui';
import { AvatarPicker } from '../../../../_components/avatar-picker';
import { rule, unexpected, useForm } from '../../../../_lib/use-form';
import { RequireRoles, useStaff } from '../../_components/shell';

const EMPTY = { current: '', next: '', again: '' };

/** `invalid` only comes from the confirmation check: the API has no such rule for passwords. */
const MESSAGES = { invalid: 'A confirmação não confere com a nova senha.' };

function Account() {
  const { token, impersonated, name, avatarUrl, setAvatarUrl } = useStaff();
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  // Elo support enters with a temporary pass: there is no account of its own to change here.
  useEffect(() => {
    if (impersonated) router.replace(`/r/${slug}/dashboard`);
  }, [impersonated, router, slug]);
  const form = useForm(
    EMPTY,
    {
      current: (v: string): FieldError | null => (v ? null : { code: 'required' }),
      next: rule(FIELD_RULES.password),
      again: (v: string, all) => (!v ? { code: 'required' } : v !== all.next ? { code: 'invalid' } : null),
    },
    MESSAGES,
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.validate()) return;
    setLoading(true);
    try {
      await api('/api/me/password', { method: 'PATCH', body: { current: form.values.current, next: form.values.next }, token });
      form.reset(EMPTY);
      setMsg({ ok: true, text: 'Senha alterada.' });
    } catch (err) {
      if (form.fromServer(err)) return;
      setMsg({
        ok: false,
        text: err instanceof ApiError && err.status === 401 ? 'A senha atual está incorreta.' : err instanceof ApiError && err.code === 'same_password' ? 'Escolha uma senha diferente da atual.' : unexpected(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Minha conta" description="Se esqueceu a senha, peça ao titular ou a um gerente para redefinir." />
      <div className="space-y-5">
      <GlassCard strong className="space-y-4 p-6">
        <h2 className="font-semibold">Foto de perfil</h2>
        <AvatarPicker name={name} url={avatarUrl} endpoint="/api/me/avatar" token={token} onChange={setAvatarUrl} />
      </GlassCard>
      <GlassCard strong className="p-6">
        <h2 className="mb-4 font-semibold">Senha</h2>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Senha atual" error={form.errors.current}><PasswordInput {...form.bind('current')} maxLength={FIELD_RULES.password.max} autoComplete="current-password" /></Field>
          <Field label="Nova senha" hint="Pelo menos 8 caracteres." error={form.errors.next}><PasswordInput {...form.bind('next')} maxLength={FIELD_RULES.password.max} autoComplete="new-password" /></Field>
          <Field label="Repita a nova senha" error={form.errors.again}><PasswordInput {...form.bind('again')} maxLength={FIELD_RULES.password.max} autoComplete="new-password" /></Field>
          {msg && <p role="alert" className={`text-sm ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}
          <Button type="submit" loading={loading}><KeyRound size={16} /> Alterar senha</Button>
        </form>
      </GlassCard>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireRoles roles={['restaurant_admin', 'manager', 'waiter', 'kitchen', 'cashier']}>
      <Account />
    </RequireRoles>
  );
}
