'use client';

import { ImagePlus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, apiUpload } from '@elo/client';
import { Input, Spinner } from '@elo/ui';

interface MediaItem {
  id: string;
  url: string;
  thumbUrl: string;
  name: string;
}

const MAX_MB = 5;

const reason = (e: unknown) => {
  if (!(e instanceof ApiError)) return 'Não foi possível enviar. Tente de novo.';
  if (e.status === 413) return `A imagem passa de ${MAX_MB} MB.`;
  if (e.code === 'invalid_image' || e.code === 'unsupported_image_type') return 'Use uma imagem JPG, PNG ou WebP.';
  if (e.code === 'image_in_use') return 'Esta imagem está em uso por um produto.';
  return 'Não foi possível concluir. Tente de novo.';
};

/** Escolhe a foto do produto no banco de imagens do restaurante, ou envia uma nova. */
export function ImagePicker({ token, value, onChange }: { token: string; value: string; onChange: (url: string) => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<MediaItem[]>('/api/catalog/media', { token }));
    } catch {
      setItems([]);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const send = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) return setError('Escolha um arquivo de imagem.');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`A imagem passa de ${MAX_MB} MB.`);
    setBusy(true);
    try {
      const created = await apiUpload<MediaItem>('/api/catalog/media', file, token);
      setItems((list) => [created, ...(list ?? [])]);
      onChange(created.url);
    } catch (e) {
      setError(reason(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: MediaItem) => {
    setError(null);
    try {
      await api(`/api/catalog/media/${item.id}`, { method: 'DELETE', token });
      setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
      if (value === item.url) onChange('');
    } catch (e) {
      setError(reason(e));
    }
  };

  const external = value && !value.startsWith('/api/media/');

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void send(e.dataTransfer.files[0]); }}
        onPaste={(e) => void send(e.clipboardData.files[0])}
        className={`grid place-items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${drag ? 'border-brand bg-brand/10' : 'border-line/70'}`}
      >
        {busy ? (
          <Spinner />
        ) : (
          <>
            <ImagePlus className="text-brand" size={28} />
            <p className="text-sm">Arraste uma foto, cole ou <button type="button" className="font-semibold text-brand underline" onClick={() => input.current?.click()}>escolha no aparelho</button></p>
            <p className="text-xs text-muted">JPG, PNG ou WebP, até {MAX_MB} MB. A imagem é reduzida automaticamente.</p>
          </>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {value && (
        <div className="flex items-center gap-3 rounded-md border border-line/50 p-2">
          <img src={value} alt="" className="h-16 w-16 rounded-md object-cover" />
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{external ? value : 'Foto escolhida'}</span>
          <button type="button" aria-label="Tirar a foto do produto" onClick={() => onChange('')} className="grid h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger"><X size={17} /></button>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium">Suas imagens</h3>
        {items === null && <Spinner />}
        {items?.length === 0 && <p className="text-sm text-muted">Nenhuma imagem enviada ainda.</p>}
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items?.map((i) => (
            <li key={i.id} className="group relative">
              <button type="button" onClick={() => onChange(i.url)} aria-label={`Usar ${i.name}`} aria-pressed={value === i.url} className={`block aspect-square w-full overflow-hidden rounded-md border-2 transition ${value === i.url ? 'border-brand' : 'border-transparent hover:border-brand/50'}`}>
                <img src={i.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
              <button type="button" aria-label={`Apagar ${i.name}`} onClick={() => remove(i)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-pill bg-black/55 text-white opacity-0 transition focus:opacity-100 group-hover:opacity-100"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Usar o link de uma imagem</summary>
        <div className="mt-2">
          <Input type="url" value={external ? value : ''} onChange={(e) => onChange(e.target.value)} placeholder="https://" aria-label="Link da imagem" />
        </div>
      </details>
    </div>
  );
}
