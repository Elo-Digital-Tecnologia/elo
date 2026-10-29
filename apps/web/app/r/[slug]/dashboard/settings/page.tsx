'use client';

import { Save } from 'lucide-react';
import { useState } from 'react';
import { api } from '@elo/client';
import { brazilPhone, contact, instagramHandle, LIMITS, maskPhone, type OpeningHours, personName } from '@elo/core';
import { Button, Field, GlassCard, Input, PageHeader, PasswordInput, Switch } from '@elo/ui';
import { ImageField } from '../../../../_components/image-field';
import { Shell, useStaff } from '../../_components/shell';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface Day {
  open: boolean;
  from: string;
  to: string;
}

const toDays = (hours: OpeningHours | null): Day[] =>
  DAYS.map((_, i) => {
    const h = hours?.[i];
    return h ? { open: true, from: h.open, to: h.close } : { open: false, from: '11:00', to: '23:00' };
  });

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <GlassCard strong className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </GlassCard>
  );
}

function Settings() {
  const { token, me, setMe } = useStaff();
  const [form, setForm] = useState({
    name: me.name,
    description: me.description ?? '',
    logoUrl: me.logoUrl ?? '',
    coverUrl: me.coverUrl ?? '',
    address: me.address ?? '',
    phone: me.phone ?? '',
    instagram: me.instagram ? `@${me.instagram.replace(/^@/, '')}` : '',
    wifiName: me.wifiName ?? '',
    wifiPassword: me.wifiPassword ?? '',
    managerName: me.managerName,
    managerContact: me.managerContact,
    fee: String(me.serviceFeeBps / 100).replace('.', ','),
  });
  const [showHours, setShowHours] = useState(me.openingHours !== null);
  const [days, setDays] = useState<Day[]>(toDays(me.openingHours));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [loading, setLoading] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const setDay = (i: number, patch: Partial<Day>) => setDays((d) => d.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(form.fee.replace(',', '.'));
    const maxPct = LIMITS.serviceFeeBpsMax / 100;
    const found: typeof errors = {};
    if (form.name.trim().length < 2) found.name = 'Informe o nome do restaurante.';
    if (!personName(form.managerName)) found.managerName = 'Use só letras, como em "Maria da Silva".';
    if (!contact(form.managerContact)) found.managerContact = 'Informe um telefone com DDD ou um e-mail.';
    if (form.phone.trim() && !brazilPhone(form.phone)) found.phone = 'Telefone com DDD, como (11) 4000-1234.';
    if (form.instagram.trim() && !instagramHandle(form.instagram)) found.instagram = 'Só o nome do perfil, como @seurestaurante.';
    if (!Number.isFinite(pct) || pct < 0 || pct > maxPct) found.fee = `Entre 0% e ${maxPct}%.`;
    setErrors(found);
    if (Object.keys(found).length) return setMsg({ ok: false, text: 'Corrija os campos marcados.' });
    setLoading(true);
    setMsg(null);
    try {
      const updated = await api<typeof me>('/api/restaurant/settings', {
        method: 'PATCH',
        token,
        body: {
          name: form.name,
          managerName: form.managerName,
          managerContact: form.managerContact,
          serviceFeeBps: Math.round(pct * 100),
          description: form.description,
          logoUrl: form.logoUrl,
          coverUrl: form.coverUrl,
          address: form.address,
          phone: form.phone.trim() ? brazilPhone(form.phone) : '',
          instagram: form.instagram.trim() ? instagramHandle(form.instagram) : '',
          wifiName: form.wifiName,
          wifiPassword: form.wifiPassword,
          openingHours: showHours ? days.map((d) => (d.open ? { open: d.from, close: d.to } : null)) : null,
        },
      });
      setMe({ ...me, ...updated });
      setForm((f) => ({ ...f, phone: updated.phone ?? '', instagram: updated.instagram ? `@${updated.instagram}` : '', managerContact: updated.managerContact, managerName: updated.managerName }));
      setMsg({ ok: true, text: 'Alterações salvas.' });
    } catch {
      setMsg({ ok: false, text: 'Não foi possível salvar. Confira os campos e os horários.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Configurações" />
      <form onSubmit={submit} className="max-w-2xl space-y-5">
        <Section title="Identidade" hint="Aparece no topo do cardápio dos clientes.">
          <Field label="Nome do restaurante" error={errors.name}><Input value={form.name} onChange={(e) => set({ name: e.target.value })} invalid={!!errors.name} minLength={2} maxLength={120} required /></Field>
          <Field label="Endereço do cardápio" hint="Não muda: já está nos QR Codes e nas tags. Só a Elo Digital altera.">
            <Input value={me.slug} disabled />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <ImageField label="Logo" token={token} value={form.logoUrl} onChange={(logoUrl) => set({ logoUrl })} />
            <ImageField label="Capa" token={token} value={form.coverUrl} onChange={(coverUrl) => set({ coverUrl })} wide />
          </div>
          <Field label="Descrição" hint={`${form.description.length}/${LIMITS.description}`}>
            <textarea rows={3} maxLength={LIMITS.description} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Pizzas no forno a lenha, desde 1998." />
          </Field>
        </Section>

        <Section title="Contato">
          <Field label="Endereço"><Input value={form.address} onChange={(e) => set({ address: e.target.value })} maxLength={LIMITS.address} placeholder="Rua das Flores, 100 · Centro" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone" error={errors.phone}><Input value={form.phone} onChange={(e) => set({ phone: maskPhone(e.target.value) })} invalid={!!errors.phone} inputMode="tel" maxLength={16} placeholder="(11) 4000-1234" /></Field>
            <Field label="Instagram" error={errors.instagram}><Input value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} invalid={!!errors.instagram} maxLength={60} placeholder="@seurestaurante" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></Field>
          </div>
        </Section>

        <Section title="Horário de funcionamento" hint="Mostra no cardápio se o restaurante está aberto agora.">
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch label="Mostrar horário no cardápio" checked={showHours} onChange={setShowHours} /> Mostrar horário no cardápio
          </label>
          {showHours && (
            <ul className="divide-y divide-line/40">
              {days.map((d, i) => (
                <li key={DAYS[i]} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <span className="w-24 text-sm font-medium">{DAYS[i]}</span>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <Switch label={`${DAYS[i]} aberto`} checked={d.open} onChange={(open) => setDay(i, { open })} /> {d.open ? 'Aberto' : 'Fechado'}
                  </label>
                  {d.open && (
                    <span className="flex w-full flex-wrap items-center gap-2 text-sm sm:ml-auto sm:w-auto">
                      <Input type="time" value={d.from} onChange={(e) => setDay(i, { from: e.target.value })} aria-label={`${DAYS[i]}: abre`} required className="!w-auto min-w-[9.5rem] tabular-nums" />
                      <span className="text-muted">às</span>
                      <Input type="time" value={d.to} onChange={(e) => setDay(i, { to: e.target.value })} aria-label={`${DAYS[i]}: fecha`} required className="!w-auto min-w-[9.5rem] tabular-nums" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {showHours && <p className="text-xs text-muted">Se o horário de fechar for menor que o de abrir, o restaurante fecha depois da meia-noite.</p>}
        </Section>

        <Section title="Wi-Fi para clientes" hint="Aparece só para quem está com a mesa aberta. Nunca no link de consulta.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da rede"><Input value={form.wifiName} onChange={(e) => set({ wifiName: e.target.value })} maxLength={LIMITS.wifiName} /></Field>
            <Field label="Senha"><PasswordInput value={form.wifiPassword} onChange={(e) => set({ wifiPassword: e.target.value })} maxLength={LIMITS.wifiPassword} autoComplete="off" /></Field>
          </div>
        </Section>

        <Section title="Gestão">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do gerente" error={errors.managerName}><Input value={form.managerName} onChange={(e) => set({ managerName: e.target.value })} invalid={!!errors.managerName} maxLength={LIMITS.personName.max} required /></Field>
            <Field label="Contato do gerente" hint="Telefone com DDD ou e-mail." error={errors.managerContact}><Input value={form.managerContact} onChange={(e) => set({ managerContact: e.target.value })} invalid={!!errors.managerContact} maxLength={120} required /></Field>
          </div>
          <Field label="Taxa de serviço (%)" hint={`De 0% a ${LIMITS.serviceFeeBpsMax / 100}%. O cliente pode recusar; o garçom e o caixa podem remover.`} error={errors.fee}>
            <Input value={form.fee} onChange={(e) => set({ fee: e.target.value.replace(/[^\d,.]/g, '') })} invalid={!!errors.fee} inputMode="decimal" maxLength={5} required />
          </Field>
        </Section>

        {msg && <p role="alert" className={`text-sm ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}
        <Button type="submit" loading={loading}><Save size={16} /> Salvar alterações</Button>
      </form>
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
