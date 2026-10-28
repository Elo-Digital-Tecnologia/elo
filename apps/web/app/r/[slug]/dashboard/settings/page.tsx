'use client';

import { Save } from 'lucide-react';
import { useState } from 'react';
import { api } from '@elo/client';
import { Button, Field, GlassCard, PageHeader } from '@elo/ui';
import { Shell, useStaff } from '../../_components/shell';

function Settings() {
  const { token, me, setMe } = useStaff();
  const [form, setForm] = useState({
    name: me.name,
    managerName: me.managerName,
    managerContact: me.managerContact,
    fee: String(me.serviceFeeBps / 100).replace('.', ','),
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(form.fee.replace(',', '.'));
    if (!Number.isFinite(pct) || pct < 0 || pct > 30) return setMsg({ ok: false, text: 'A taxa de serviço deve ficar entre 0% e 30%.' });
    setLoading(true);
    setMsg(null);
    try {
      const updated = await api<typeof me>('/api/restaurant/settings', {
        method: 'PATCH',
        token,
        body: { name: form.name, managerName: form.managerName, managerContact: form.managerContact, serviceFeeBps: Math.round(pct * 100) },
      });
      setMe({ ...me, ...updated });
      setMsg({ ok: true, text: 'Configurações salvas.' });
    } catch {
      setMsg({ ok: false, text: 'Não foi possível salvar. Confira os campos.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Configurações" />
      <GlassCard strong className="max-w-xl p-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome do restaurante"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} required /></Field>
          <Field label="Endereço do cardápio" hint="Não muda: já está nos QR Codes e nas tags. Só a Elo Digital altera.">
            <input value={me.slug} disabled />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do gerente"><input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} minLength={2} required /></Field>
            <Field label="Contato do gerente"><input value={form.managerContact} onChange={(e) => setForm({ ...form, managerContact: e.target.value })} minLength={5} required /></Field>
          </div>
          <Field label="Taxa de serviço (%)" hint="O cliente pode recusar. O garçom e o caixa podem remover.">
            <input value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} inputMode="decimal" required />
          </Field>
          {msg && <p role="alert" className={`text-sm ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}
          <Button type="submit" loading={loading}><Save size={16} /> Salvar</Button>
        </form>
      </GlassCard>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Shell roles={['restaurant_admin']}>
      <Settings />
    </Shell>
  );
}
