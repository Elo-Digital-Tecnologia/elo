'use client';

import type { SessionStateView } from '@elo/core/api/views/table.view';
import { api } from '@elo/client/http/api-client';
import { ApiError } from '@elo/client/http/api-error';
import { HTTP_STATUS } from '@elo/client/http/http-status';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { AlertsProvider } from '@elo/ui/components/feedback/alerts';
import { Button } from '@elo/ui/components/forms/button';
import { Hourglass, Lock, Store, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { forgetTokenKeys } from '#/_lib/guest-storage';
import { SESSION_ELSEWHERE_TEXTS, SESSION_NOTICES } from '#/_lib/messages/tables';
import { MenuSkeleton } from '../../_components/menu/menu-skeleton';
import { Notice } from '../../_components/notice';
import { TableMenuView } from '../../_components/table/table-menu-view';

type Failure = 'invalid' | 'unavailable' | 'in_use' | 'elsewhere' | 'busy' | 'error';

const failureOf = (e: unknown): Failure =>
    !(e instanceof ApiError)
        ? 'error'
        : e.code === ApiErrorCode.MENU_UNAVAILABLE
          ? 'unavailable'
          : e.code === ApiErrorCode.ACTIVE_TABLE_ELSEWHERE
            ? 'elsewhere'
            : e.status === HTTP_STATUS.NOT_FOUND
            ? 'invalid'
            : e.status === HTTP_STATUS.CONFLICT
              ? 'in_use'
              : e.status === HTTP_STATUS.TOO_MANY_REQUESTS
                ? 'busy'
                : 'error';

const ICONS: Record<Failure, React.ReactNode> = {
    invalid: <Lock size={30} />,
    unavailable: <Store size={30} />,
    in_use: <Lock size={30} />,
    elsewhere: <Lock size={30} />,
    busy: <Hourglass size={30} />,
    error: <WifiOff size={30} />
};

/**
 * Table link from the QR code or NFC tag. Trades the token for the session cookie once,
 * then takes the token out of the address bar whatever the answer, so it cannot be read
 * back from the screen or the history. A reload continues on `/<slug>` with the cookie.
 */
export default function TableLink({ params }: { params: { slug: string; token: string } }) {
    const [state, setState] = useState<SessionStateView | null>(null);
    const [failure, setFailure] = useState<Failure | null>(null);
    /** The table this device is already at, when the scan was refused for that. */
    const [ownTable, setOwnTable] = useState<string | null>(null);
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        forgetTokenKeys();
        // A QR code printed with an old address lands on the current one.
        let slug = params.slug;
        api<SessionStateView>(`/api/public/${params.slug}/${params.token}/session`, {
            method: 'POST'
        })
            .then((s) => {
                slug = s.restaurant.slug;
                setState(s);
            })
            .catch((e) => {
                setFailure(failureOf(e));
                if (e instanceof ApiError)
                    setOwnTable(
                        e.detailsOf(ApiErrorCode.ACTIVE_TABLE_ELSEWHERE)[0]?.tableName ??
                            null
                    );
            })
            .finally(() => window.history.replaceState(null, '', `/${slug}`));
    }, [params.slug, params.token]);

    if (failure)
        return (
            <Notice
                title={
                    failure === 'elsewhere' && ownTable
                        ? SESSION_ELSEWHERE_TEXTS.title(ownTable)
                        : SESSION_NOTICES[failure].title
                }
                icon={ICONS[failure]}
                action={
                    failure === 'elsewhere' && (
                        // The restaurant page resumes this device's session from the cookie.
                        <Button onClick={() => window.location.assign(`/${params.slug}`)}>
                            {SESSION_ELSEWHERE_TEXTS.back}
                        </Button>
                    )
                }
            >
                {SESSION_NOTICES[failure].text}
            </Notice>
        );
    if (!state) return <MenuSkeleton />;
    return (
        <AlertsProvider>
            <TableMenuView initial={state} />
        </AlertsProvider>
    );
}
