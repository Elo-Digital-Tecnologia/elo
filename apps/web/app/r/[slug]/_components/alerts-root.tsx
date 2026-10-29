'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AlertsProvider } from '@elo/ui';

/** Alerts stay mounted across panel pages, so a banner survives navigation. */
export function AlertsRoot({ children }: { children: ReactNode }) {
  const router = useRouter();
  return <AlertsProvider onOpen={(href) => router.push(href)}>{children}</AlertsProvider>;
}
