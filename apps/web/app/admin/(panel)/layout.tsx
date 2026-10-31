import type { ReactNode } from 'react';
import { AdminShell } from '../_components/shell';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
