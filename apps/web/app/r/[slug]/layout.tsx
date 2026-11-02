import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AlertsRoot } from './_components/alerts-root';
import { CurrentLink } from './_components/current-link';

export const metadata: Metadata = { title: 'Equipe · Elo Digital' };

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return (
    <AlertsRoot>
      <CurrentLink />
      {children}
    </AlertsRoot>
  );
}
