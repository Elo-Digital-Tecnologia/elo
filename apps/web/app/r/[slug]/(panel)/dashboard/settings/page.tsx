'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { brazilPhone, FIELD_RULES, type FieldError, instagramHandle, LIMITS, maskPhone, WEEKDAYS } from '@elo/core';
import { Field, GlassCard, Input, PageHeader, PasswordInput, SaveBar, Switch, Textarea } from '@elo/ui';
import { ImageField } from '../../../../../_components/image-field';
import { rule, unexpected, useForm } from '../../../../../_lib/use-form';
import { HoursEditor, hoursErrors, toDrafts, toOpeningHours } from '../../../_components/hours-editor';
import { RequireRoles, useStaff } from '../../../_components/shell';

const MAX_FEE_PCT = LIMITS.serviceFeeBpsMax / 100;
const FEE_MESSAGE = `Use um valor maior que 0% e até ${MAX_FEE_PCT}%, como 10 ou 12,5. Para não cobrar, desligue a taxa.`;
/** A fee that is switched on starts at this percent. */
const DEFAULT_FEE = '10';
/** The fee is the only number in this form, so its range codes always mean the percent. */
const MESSAGES = { too_small: FEE_MESSAGE, too_large: FEE_MESSAGE, not_integer: FEE_MESSAGE };

const percentOf = (fee: string) => Number(fee.replace(',', '.'));

const feeError = (fee: string): FieldError | null => {
  if (!fee.trim()) return { code: 'required' };
  const pct = percentOf(fee);
  if (!Number.isFinite(pct) || pct > MAX_FEE_PCT) return { code: 'too_large' };
  return pct > 0 ? null : { code: 'too_small' };
};

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
  const [feeOn, setFeeOn] = useState(me.serviceFeeBps > 0);
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
      fee: me.serviceFeeBps > 0 ? String(me.serviceFeeBps / 100).replace('.', ',') : DEFAULT_FEE,
      googleReviewUrl: me.googleReviewUrl ?? '',
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
      googleReviewUrl: rule(FIELD_RULES.googleReviewUrl),
      fee: (fee: string) => (feeOn ? feeError(fee) : null),
    },
    MESSAGES,
  );
  const [feeRefusal, setFeeRefusal] = useState(me.guestFeeRefusal);
  const [showHours, setShowHours] = useState(me.openingHours !== null);
  const [days, setDays] = useState(toDrafts(me.openingHours));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const values = form.values;

  // What is on the page against what was last saved: any difference asks to be saved.
  const snapshot = () => ({ values: { ...values, fee: feeOn ? values.fee : '' }, feeOn, feeRefusal, showHours, days });
  const [saved, setSaved] = useState(snapshot);
  const dirty = JSON.stringify(snapshot()) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const discard = () => {
    form.reset({ ...saved.values, fee: saved.feeOn ? saved.values.fee : DEFAULT_FEE });
    setFeeOn(saved.feeOn);
    setFeeRefusal(saved.feeRefusal);
    setShowHours(saved.showHours);
    setDays(saved.days);
    setMsg(null);
  };
  const turnFee = (on: boolean) => {
    setFeeOn(on);
    // A fee never comes with the refusal: it is a separate choice, off until someone makes it.
    setFeeRefusal(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.validate()) return;
    const problems = showHours ? hoursErrors(days) : [];
    const badDay = problems.findIndex(Boolean);
    if (badDay >= 0) return setMsg({ ok: false, text: `${WEEKDAYS[badDay][0].toUpperCase()}${WEEKDAYS[badDay].slice(1)}: ${problems[badDay]}` });
    setLoading(true);
    try {
      const updated = await api<typeof me>('/api/restaurant/settings', {
        method: 'PATCH',
        token,
        body: {
          name: values.name,
          managerName: values.managerName,
          managerContact: values.managerContact,
          serviceFeeBps: feeOn ? Math.round(percentOf(values.fee) * 100) : 0,
          guestFeeRefusal: feeOn && feeRefusal,
          googleReviewUrl: values.googleReviewUrl,
          description: values.description,
          logoUrl: values.logoUrl,
          coverUrl: values.coverUrl,
          address: values.address,
          phone: values.phone.trim() ? brazilPhone(values.phone) : '',
          instagram: values.instagram.trim() ? instagramHandle(values.instagram) : '',
          wifiName: values.wifiName,
          wifiPassword: values.wifiPassword,
          openingHours: showHours ? toOpeningHours(days) : null,
        },
      });
      setMe({ ...me, ...updated });
      const next = { ...values, phone: updated.phone ?? '', instagram: updated.instagram ? `@${updated.instagram}` : '', managerContact: updated.managerContact, managerName: updated.managerName, googleReviewUrl: updated.googleReviewUrl ?? '' };
      const nextDays = showHours ? toDrafts(updated.openingHours) : days;
      form.setValues(next);
      setDays(nextDays);
      setSaved({ values: { ...next, fee: feeOn ? next.fee : '' }, feeOn, feeRefusal: feeOn && feeRefusal, showHours, days: nextDays });
      setMsg({ ok: true, text: 'Alterações salvas.' });
    } catch (err) {
      if (form.fromServer(err, { serviceFeeBps: 'fee' })) return;
      const hours = err instanceof ApiError && Object.keys(err.fields).some((k) => k.startsWith('openingHours'));
      setMsg({ ok: false, text: hours ? 'Revise os horários: use o formato 00:00 e deixe os turnos em ordem, sem se sobrepor.' : unexpected(err) });
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
          <Field label="Endereço do cardápio" hint="Só a equipe Elo Digital altera. Se mudar, os QR Codes e as tags antigos continuam funcionando.">
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
          {showHours && <HoursEditor days={days} onChange={setDays} today={new Date().getDay()} />}
        </Section>

        <Section title="Wi-Fi para clientes" hint="Aparece só para quem está com a mesa aberta. Nunca no link de consulta.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da rede" error={form.errors.wifiName}><Input {...form.bind('wifiName')} maxLength={FIELD_RULES.wifiName.max} /></Field>
            <Field label="Senha" error={form.errors.wifiPassword}><PasswordInput {...form.bind('wifiPassword')} maxLength={FIELD_RULES.wifiPassword.max} autoComplete="off" /></Field>
          </div>
        </Section>

        <Section title="Responsável pelo contrato" hint="O contato da Elo Digital sobre a assinatura. Não aparece para os clientes. Mudar o responsável não altera os contratos já assinados.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do responsável" error={form.errors.managerName}><Input {...form.bind('managerName')} maxLength={FIELD_RULES.personName.max} /></Field>
            <Field label="Contato do responsável" hint="Telefone com DDD ou e-mail." error={form.errors.managerContact}><Input {...form.bind('managerContact')} maxLength={FIELD_RULES.contact.max} /></Field>
          </div>
        </Section>

        <Section title="Taxa de serviço" hint="Entra na conta de cada mesa. O garçom e o caixa sempre podem remover.">
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch label="Cobrar taxa de serviço" checked={feeOn} onChange={turnFee} /> Cobrar taxa de serviço
          </label>
          {!feeOn && <p className="text-sm text-muted">Desligado, a conta não leva taxa de serviço.</p>}
          {feeOn && (
            <>
              <Field label="Taxa de serviço (%)" hint={`Acima de 0% e até ${MAX_FEE_PCT}%.`} error={form.errors.fee}>
                <Input {...form.bind('fee')} onChange={(e) => form.set('fee', e.target.value.replace(/[^\d,.]/g, ''))} inputMode="decimal" maxLength={5} />
              </Field>
              <label className="flex items-start gap-3 text-sm">
                <Switch label="O cliente pode recusar a taxa pelo cardápio" checked={feeRefusal} onChange={setFeeRefusal} />
                <span>
                  <span className="block font-medium">O cliente pode recusar a taxa pelo cardápio</span>
                  <span className="block text-muted">Desligado, a opção não aparece na conta do cliente e só a equipe remove a taxa.</span>
                </span>
              </label>
            </>
          )}
        </Section>

        <Section title="Avaliação no Google" hint="Depois de avaliar o atendimento, o cliente é convidado a avaliar o restaurante também no Google Maps.">
          <Field
            label="Link de avaliação"
            hint="No Google Meu Negócio, use “Pedir avaliações” e cole o link: ele abre direto a tela de avaliar. O link do Google Maps também funciona. Vazio, o convite não aparece."
            error={form.errors.googleReviewUrl}
          >
            <Input {...form.bind('googleReviewUrl')} maxLength={FIELD_RULES.googleReviewUrl.max} inputMode="url" placeholder="https://g.page/r/..." autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </Field>
        </Section>

        <SaveBar dirty={dirty} loading={loading} onDiscard={discard} message={msg} />
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
