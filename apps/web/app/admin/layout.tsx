import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Administração · Elo Digital' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
