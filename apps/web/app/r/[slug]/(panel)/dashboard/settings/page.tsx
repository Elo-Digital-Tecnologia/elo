'use client';

import { Save } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@elo/client';
import { brazilPhone, FIELD_RULES, type FieldError, instagramHandle, LIMITS, maskPhone, type OpeningHours } from '@elo/core';
import { Button, Field, GlassCard, Input, PageHeader, PasswordInput, Switch, Textarea, TimeInput } from '@elo/ui';
import { ImageField } from '../../../../../_components/image-field';
import { rule, unexpected, useForm } from '../../../../../_lib/use-form';
import { RequireRoles, useStaff } from '../../../_components/shell';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface Day {
  open: boolean;
  from: string;
  to: string;
}

const MAX_FEE_PCT = LIMITS.serviceFeeBpsMax / 100;
const FEE_MESSAGE = `Use um valor de 0% a ${MAX_FEE_PCT}%, como 10 ou 12,5.`;
/** The fee is the only number in this form, so its range codes always mean the percent. */
const MESSAGES = { too_small: FEE_MESSAGE, too_large: FEE_MESSAGE, not_integer: FEE_MESSAGE };

const percentOf = (fee: string) => Number(fee.replace(',', '.'));

const feeError = (fee: string): FieldError | null => {
  if (!fee.trim()) return { code: 'required' };
  const pct = percentOf(fee);
  return Number.isFinite(pct) && pct >= 0 && pct <= MAX_FEE_PCT ? null : { code: 'too_large' };
};

const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

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
  const form = useForm(
    {
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
    },
    {
      name: rule(FIELD_RULES.restaurantName),
      description: rule(FIELD_RULES.description),
      logoUrl: rule(FIELD_RULES.imageUrl),
      coverUrl: rule(FIELD_RULES.imageUrl),
      address: rule(FIELD_RULES.address),
      phone: rule(FIELD_RULES.phone),
      instagram: rule(FIELD_RULES.instagram),
      wifiName: rule(FIELD_RULES.wifiName),
      wifiPassword: rule(FIELD_RULES.wifiPassword),
      managerName: rule(FIELD_RULES.personName),
      managerContact: rule(FIELD_RULES.contact),
      fee: feeError,
    },
    MESSAGES,
  );
  const [feeRefusal, setFeeRefusal] = useState(me.guestFeeRefusal);
  const [showHours, setShowHours] = useState(me.openingHours !== null);
  const [days, setDays] = useState<Day[]>(toDays(me.openingHours));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const values = form.values;
  const setDay = (i: number, patch: Partial<Day>) => setDays((d) => d.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.validate()) return;
    const badDay = showHours ? days.findIndex((d) => d.open && (!isTime(d.from) || !isTime(d.to))) : -1;
    if (badDay >= 0) return setMsg({ ok: false, text: `Informe os horários de abrir e fechar de ${DAYS[badDay]}.` });
    setLoading(true);
    try {
      const updated = await api<typeof me>('/api/restaurant/settings', {
        method: 'PATCH',
        token,
        body: {
          name: values.name,
          managerName: values.managerName,
          managerContact: values.managerContact,
          serviceFeeBps: Math.round(percentOf(values.fee) * 100),
          guestFeeRefusal: feeRefusal,
          description: values.description,
          logoUrl: values.logoUrl,
          coverUrl: values.coverUrl,
          address: values.address,
          phone: values.phone.trim() ? brazilPhone(values.phone) : '',
          instagram: values.instagram.trim() ? instagramHandle(values.instagram) : '',
          wifiName: values.wifiName,
          wifiPassword: values.wifiPassword,
          openingHours: showHours ? days.map((d) => (d.open ? { open: d.from, close: d.to } : null)) : null,
        },
      });
      setMe({ ...me, ...updated });
      form.setValues((f) => ({ ...f, phone: updated.phone ?? '', instagram: updated.instagram ? `@${updated.instagram}` : '', managerContact: updated.managerContact, managerName: updated.managerName }));
      setMsg({ ok: true, text: 'Alterações salvas.' });
    } catch (err) {
      if (form.fromServer(err, { serviceFeeBps: 'fee' })) return;
      const hours = err instanceof ApiError && Object.keys(err.fields).some((k) => k.startsWith('openingHours'));
      setMsg({ ok: false, text: hours ? 'Informe os horários no formato 00:00 em cada dia aberto.' : unexpected(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configurações" />
      <form onSubmit={submit} noValidate className="space-y-5">
        <Section title="Identidade" hint="Aparece no topo do cardápio dos clientes.">
          <Field label="Nome do restaurante" error={form.errors.name}><Input {...form.bind('name')} maxLength={FIELD_RULES.restaurantName.max} /></Field>
          <Field label="Endereço do cardápio" hint="Não muda: já está nos QR Codes e nas tags. Só a Elo Digital altera.">
            <Input value={me.slug} disabled />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <ImageField label="Logo" token={token} value={values.logoUrl} onChange={(logoUrl) => form.set('logoUrl', logoUrl)} />
            <ImageField label="Capa" token={token} value={values.coverUrl} onChange={(coverUrl) => form.set('coverUrl', coverUrl)} wide />
          </div>
          {form.errors.logoUrl && <p aria-live="polite" className="text-xs text-danger">Logo: {form.errors.logoUrl}</p>}
          {form.errors.coverUrl && <p aria-live="polite" className="text-xs text-danger">Capa: {form.errors.coverUrl}</p>}
          <Field label="Descrição" hint={`${values.description.length}/${FIELD_RULES.description.max}`} error={form.errors.description}>
            <Textarea {...form.bind('description')} rows={3} maxLength={FIELD_RULES.description.max} placeholder="Pizzas no forno a lenha, desde 1998." />
          </Field>
        </Section>

        <Section title="Contato">
          <Field label="Endereço" error={form.errors.address}><Input {...form.bind('address')} maxLength={FIELD_RULES.address.max} placeholder="Rua das Flores, 100 · Centro" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone" error={form.errors.phone}><Input {...form.bind('phone')} onChange={(e) => form.set('phone', maskPhone(e.target.value))} inputMode="tel" maxLength={16} placeholder="(11) 4000-1234" /></Field>
            <Field label="Instagram" error={form.errors.instagram}><Input {...form.bind('instagram')} maxLength={FIELD_RULES.instagram.max} placeholder="@seurestaurante" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></Field>
          </div>
        </Section>

        <Section title="Horário de funcionamento" hint="Fora do horário, nenhuma mesa nova abre; as mesas já abertas terminam normalmente.">
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch label="Usar horário de funcionamento" checked={showHours} onChange={setShowHours} /> Usar horário de funcionamento
          </label>
          {!showHours && <p className="text-sm text-muted">Desligado, o restaurante fica sempre aberto.</p>}
          <p className="text-sm text-muted">
            Para imprevistos, férias ou reformas, use <Link href={`/r/${me.slug}/dashboard/hours`} className="font-semibold text-brand underline-offset-2 hover:underline">Funcionamento</Link> e agende uma parada.
          </p>
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
                      <TimeInput value={d.from} onChange={(v) => setDay(i, { from: v })} aria-label={`${DAYS[i]}: abre`} className="!w-24 text-center" />
                      <span className="text-muted">às</span>
                      <TimeInput value={d.to} onChange={(v) => setDay(i, { to: v })} aria-label={`${DAYS[i]}: fecha`} className="!w-24 text-center" />
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
            <Field label="Nome da rede" error={form.errors.wifiName}><Input {...form.bind('wifiName')} maxLength={FIELD_RULES.wifiName.max} /></Field>
            <Field label="Senha" error={form.errors.wifiPassword}><PasswordInput {...form.bind('wifiPassword')} maxLength={FIELD_RULES.wifiPassword.max} autoComplete="off" /></Field>
          </div>
        </Section>

        <Section title="Responsável pelo contrato" hint="Quem a Elo Digital procura sobre a assinatura. Não aparece para os clientes.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do responsável" error={form.errors.managerName}><Input {...form.bind('managerName')} maxLength={FIELD_RULES.personName.max} /></Field>
            <Field label="Contato do responsável" hint="Telefone com DDD ou e-mail." error={form.errors.managerContact}><Input {...form.bind('managerContact')} maxLength={FIELD_RULES.contact.max} /></Field>
          </div>
        </Section>

        <Section title="Taxa de serviço" hint="Entra na conta de cada mesa. O garçom e o caixa sempre podem remover.">
          <Field label="Taxa de serviço (%)" hint={`De 0% a ${MAX_FEE_PCT}%. Use 0 para não cobrar.`} error={form.errors.fee}>
            <Input {...form.bind('fee')} onChange={(e) => form.set('fee', e.target.value.replace(/[^\d,.]/g, ''))} inputMode="decimal" maxLength={5} />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <Switch label="O cliente pode recusar a taxa pelo cardápio" checked={feeRefusal} onChange={setFeeRefusal} />
            <span>
              <span className="block font-medium">O cliente pode recusar a taxa pelo cardápio</span>
              <span className="block text-muted">Desligado, a opção some da conta do cliente e só a equipe remove a taxa.</span>
            </span>
          </label>
        </Section>

        {msg && <p role="alert" className={`text-sm ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}
        <Button type="submit" loading={loading}><Save size={16} /> Salvar alterações</Button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireRoles roles={['restaurant_admin']}>
      <Settings />
    </RequireRoles>
  );
}
