'use client';

import { Bell, BellOff, BellRing } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { disablePush, enablePush, isStandalone, pushState, pushSupported, type PushState, useRealtime } from '@elo/client';
import { ALERTS, alertOf, alertsRole } from '@elo/core';
import { Button, GlassCard, unlockAlertSound, useAlerts } from '@elo/ui';

const ALERT_EVENTS = ['table.updated', 'call.created', 'order.created', 'order.updated', 'order.cancelled'] as const;
const prefKey = (slug: string) => `elo.alerts.${slug}`;

function readPref(slug: string): 'on' | 'off' | null {
  try {
    const v = localStorage.getItem(prefKey(slug));
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

function writePref(slug: string, v: 'on' | 'off') {
  try {
    localStorage.setItem(prefKey(slug), v);
  } catch {
    /* storage unavailable */
  }
}

/** Whether these roles get any alert at all (a pure administrator does not). */
export const hasAlerts = (roles: string[]) => Object.values(ALERTS).some((a) => a.roles.some((r) => roles.includes(r)));

/**
 * Turns realtime events into alerts on whatever page is open. When the phone
 * also gets push and the page is in the background, the system notification
 * rings instead, so the banner stays silent.
 */
export function useStaffAlerts({ token, roles, base, push, enabled }: { token: string | null; roles: string[]; base: string; push: PushState; enabled: boolean }) {
  const { notify } = useAlerts();
  const handlers = Object.fromEntries(
    ALERT_EVENTS.map((event) => [
      event,
      (payload: unknown) => {
        const alert = alertOf(event, payload);
        if (!alert || !alertsRole(alert.kind, roles)) return;
        const spec = ALERTS[alert.kind];
        const background = document.visibilityState === 'hidden';
        notify({ title: spec.title(alert.table), body: spec.body, href: base + spec.path, tag: alert.tag }, { silent: background && push === 'on' });
      },
    ]),
  );
  useRealtime(handlers, token, enabled && !!token && hasAlerts(roles));
}

/** Sound needs one tap per page load; after a reload the first tap anywhere re-enables it. */
function useSoundUnlock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const unlock = () => unlockAlertSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [enabled]);
}

/** Header bell plus the first-time prompt. Returns both so the shell places them. */
export function useAlertsControl({ token, slug, roles }: { token: string | null; slug: string; roles: string[] }) {
  const [pref, setPref] = useState<'on' | 'off' | null>(null);
  const [push, setPush] = useState<PushState>('off');
  const [note, setNote] = useState<string | null>(null);
  const relevant = hasAlerts(roles);
  const synced = useRef(false);

  useEffect(() => {
    setPref(readPref(slug));
    void pushState().then(setPush);
  }, [slug]);

  // Already allowed on this device: register it again for whoever is signed in now.
  useEffect(() => {
    if (!token || !relevant || pref !== 'on' || synced.current || !pushSupported() || Notification.permission !== 'granted') return;
    synced.current = true;
    void enablePush(token).then(setPush).catch(() => undefined);
  }, [relevant, pref, token]);

  useSoundUnlock(relevant && pref === 'on');

  const explain = (state: PushState) =>
    state === 'unsupported'
      ? isStandalone()
        ? 'Este navegador não recebe avisos com a tela bloqueada. Os avisos tocam com o painel aberto.'
        : 'Para receber avisos com a tela bloqueada no iPhone, adicione o painel à Tela de Início (Compartilhar → Adicionar à Tela de Início) e ative de lá.'
      : state === 'denied'
        ? 'As notificações deste site estão bloqueadas no navegador. Libere nas configurações do site para receber com a tela bloqueada.'
        : state === 'unavailable'
          ? 'O servidor ainda não está configurado para avisos com a tela bloqueada. Com o painel aberto, os avisos tocam normalmente.'
          : null;

  const turnOn = useCallback(async () => {
    unlockAlertSound();
    setPref('on');
    writePref(slug, 'on');
    if (!token) return;
    try {
      const state = await enablePush(token);
      setPush(state);
      setNote(explain(state));
    } catch {
      setNote('Não foi possível ativar os avisos com a tela bloqueada. Com o painel aberto, eles tocam normalmente.');
    }
  }, [slug, token]);

  const turnOff = useCallback(async () => {
    setPref('off');
    writePref(slug, 'off');
    setNote(null);
    await disablePush(token).catch(() => undefined);
    setPush(await pushState());
  }, [slug, token]);

  const on = pref === 'on';
  const bell = relevant ? (
    <button
      onClick={on ? turnOff : turnOn}
      aria-pressed={on}
      aria-label={on ? 'Desativar avisos' : 'Ativar avisos'}
      title={on ? (push === 'on' ? 'Avisos ativos, também com a tela bloqueada' : 'Avisos ativos com o painel aberto') : 'Ativar avisos'}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill transition hover:bg-brand/10 ${on ? 'text-brand' : 'text-muted'}`}
    >
      {on ? push === 'on' ? <BellRing size={19} /> : <Bell size={19} /> : <BellOff size={19} />}
    </button>
  ) : null;

  const prompt =
    relevant && pref === null ? (
      <GlassCard className="mb-5 flex flex-col gap-3 border-brand/40 px-4 py-4 text-sm sm:flex-row sm:items-center sm:px-5 sm:py-3">
        <span className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <BellRing size={20} className="shrink-0 text-brand" />
          <span>Ative os avisos para ouvir chamados, mesas e pedidos em qualquer tela do painel.</span>
        </span>
        <span className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Button variant="ghost" onClick={turnOff}>Agora não</Button>
          <Button onClick={turnOn}>Ativar avisos</Button>
        </span>
      </GlassCard>
    ) : note ? (
      <GlassCard className="mb-5 flex flex-col gap-3 border-warning/40 px-4 py-4 text-sm sm:flex-row sm:items-center sm:px-5 sm:py-3">
        <span className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <Bell size={20} className="shrink-0 text-warning" />
          <span>{note}</span>
        </span>
        <Button variant="ghost" className="sm:shrink-0" onClick={() => setNote(null)}>Entendi</Button>
      </GlassCard>
    ) : null;

  return { bell, prompt, push, enabled: relevant && on, leave: () => disablePush(token) };
}
