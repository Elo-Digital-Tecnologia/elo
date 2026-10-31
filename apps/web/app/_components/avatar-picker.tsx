'use client';

import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { api, ApiError, apiUpload } from '@elo/client';
import { Avatar, Button } from '@elo/ui';

const ERRORS: Record<string, string> = {
  invalid_image: 'O arquivo não é uma imagem válida.',
  unsupported_image_type: 'Use uma foto em JPG, PNG ou WebP.',
};

/** Optional profile photo: the team sees it in lists and in the header, guests never do. */
export function AvatarPicker({ name, url, endpoint, token, onChange }: { name: string; url: string | null; endpoint: string; token: string; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) return setError('A foto pode ter até 5 MB.');
    setBusy(true);
    try {
      onChange((await apiUpload<{ avatarUrl: string }>(endpoint, file, token)).avatarUrl);
    } catch (e) {
      setError(e instanceof ApiError ? ERRORS[e.code] ?? 'Não foi possível enviar a foto. Tente de novo.' : 'Falha de conexão. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      await api(endpoint, { method: 'DELETE', token });
      onChange(null);
    } catch {
      setError('Não foi possível remover a foto. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} url={url} size={72} />
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" loading={busy} onClick={() => input.current?.click()}><Camera size={16} /> {url ? 'Trocar foto' : 'Enviar foto'}</Button>
          {url && <Button type="button" variant="ghost" disabled={busy} onClick={remove} className="text-danger"><Trash2 size={16} /> Remover</Button>}
        </div>
        <p className="text-xs text-muted">Opcional. JPG, PNG ou WebP, até 5 MB. Só a equipe vê.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void send(file);
        }}
      />
    </div>
  );
}
