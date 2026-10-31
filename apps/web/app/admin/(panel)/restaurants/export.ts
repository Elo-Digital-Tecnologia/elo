import { api } from '@elo/client';

/** Saves the restaurant's exported data as a JSON file on the viewer's device. */
export async function downloadExport(id: string, slug: string, token: string | null) {
  const data = await api<unknown>(`/api/admin/restaurants/${id}/export`, { token });
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `${slug}-dados-${new Date().toISOString().slice(0, 10)}.json` });
  link.click();
  URL.revokeObjectURL(url);
}
