'use client';

import type { PushState } from '@elo/client/push/push-subscription';
import { api } from '@elo/client/http/api-client';
import {
    enableGuestPush,
    pushState,
    pushSupported
} from '@elo/client/push/push-subscription';
import { guestAlertOf } from '@elo/core/alerts/alerts';
import { unlockAlertSound, useAlerts } from '@elo/ui/components/feedback/alerts';
import { Button } from '@elo/ui/components/forms/button';
import { BellRing, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { pushInviteDismissedKey } from '#/_lib/guest-storage';
import { guestAlertText } from '#/_lib/messages/alerts';

/**
 * Realtime events of the guest's table turned into on-screen alerts (sound,
 * vibration, banner). When the device also gets push and the page is in the
 * background, the system notification rings instead.
 */
export function useGuestAlertHandlers(push: PushState, quiet: (kind: string) => boolean) {
    const { notify } = useAlerts();
    return useCallback(
        (event: string) => (payload: unknown) => {
            const alert = guestAlertOf(event, payload);
            if (!alert || quiet(alert.kind)) return;
            const background = document.visibilityState === 'hidden';
            notify(
                { ...guestAlertText(alert), tag: alert.tag },
                { silent: background && push === 'on' }
            );
        },
        [notify, push, quiet]
    );
}

/**
 * Offer to keep the guest posted with the screen locked. Shown once the table is
 * open, never on browsers that cannot do it (an iPhone outside the home screen).
 */
export function useGuestPush(slug: string, tableOpen: boolean) {
    const [state, setState] = useState<PushState>('off');
    const [available, setAvailable] = useState(false);
    const [dismissed, setDismissed] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!pushSupported()) return setState('unsupported');
        void pushState().then(setState);
        try {
            setDismissed(localStorage.getItem(pushInviteDismissedKey(slug)) === '1');
        } catch {
            setDismissed(false);
        }
        api<{ key: string | null }>('/api/public/push-key')
            .then((r) => setAvailable(!!r.key))
            .catch(() => setAvailable(false));
    }, [slug]);

    // Already allowed on this phone: register it for this visit too, without asking again.
    useEffect(() => {
        if (!tableOpen || !available || state !== 'on') return;
        void enableGuestPush().catch(() => undefined);
    }, [tableOpen, available, state]);

    const dismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(pushInviteDismissedKey(slug), '1');
        } catch {
            /* storage unavailable */
        }
    };

    const enable = async () => {
        unlockAlertSound();
        setBusy(true);
        try {
            setState(await enableGuestPush());
        } catch {
            setState('off');
        } finally {
            setBusy(false);
            dismiss();
        }
    };

    const invite =
        tableOpen && available && state === 'off' && !dismissed ? (
            <div className="surface mx-4 mt-3 flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-start gap-3">
                    <BellRing size={20} className="mt-0.5 shrink-0 text-brand" />
                    <span>
                        <strong className="block">Receber avisos do seu pedido?</strong>
                        <span className="text-muted">
                            Avisamos quando o pedido ficar pronto, mesmo com a tela
                            bloqueada. Nada pessoal é guardado e os avisos param quando a
                            mesa fecha.
                        </span>
                    </span>
                </span>
                <span className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:shrink-0">
                    <Button onClick={enable} loading={busy}>
                        Ativar avisos
                    </Button>
                    <Button variant="ghost" onClick={dismiss} aria-label="Agora não">
                        <X size={16} />
                    </Button>
                </span>
            </div>
        ) : null;

    return { state, invite };
}
