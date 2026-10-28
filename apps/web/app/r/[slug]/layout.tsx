import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Equipe · Elo Digital' };

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return children;
}
