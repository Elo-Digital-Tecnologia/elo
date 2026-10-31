'use client';

import { ExternalLink, FileText, Paperclip, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError, apiBlob, apiUpload } from '@elo/client';
import { DOCUMENT_LIMITS, type DocumentView } from '@elo/core';
import { Button, Spinner } from '@elo/ui';
import { unexpected } from '../../../../../_lib/use-form';

const UPLOAD_ERRORS: Record<string, string> = {
  unsupported_document: 'Envie um PDF ou uma foto (JPG, PNG ou WebP).',
  file_too_large: 'O arquivo pode ter até 10 MB.',
  file_required: 'Escolha um arquivo.',
};

export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);

/**
 * The private file behind a document, fetched with the team's token (it is never
 * public). Returns an object URL for an `img`/`iframe`, released when unmounted.
 */
export function useDocumentUrl(doc: DocumentView | null, token: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!doc) return;
    let made: string | null = null;
    let live = true;
    setFailed(false);
    apiBlob(`/api/admin/documents/${doc.id}`, token)
      .then((blob) => {
        if (!live) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
    };
  }, [doc, token]);
  return { url, failed };
}

/** Shows a proof or contract: the photo itself or the PDF inline, with a way to open it full size. */
export function DocumentPreview({ doc, token }: { doc: DocumentView; token: string }) {
  const { url, failed } = useDocumentUrl(doc, token);
  const image = doc.mime.startsWith('image/');
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <FileText size={16} className="shrink-0 text-brand" />
          <span className="truncate font-medium">{doc.name}</span>
          <span className="shrink-0 text-muted">{fileSize(doc.bytes)}</span>
        </span>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-2 hover:underline">
            Abrir em nova aba <ExternalLink size={14} />
          </a>
        )}
      </div>
      <div className="surface grid min-h-40 place-items-center overflow-hidden">
        {failed ? (
          <p className="p-4 text-sm text-danger">Não foi possível abrir o arquivo.</p>
        ) : !url ? (
          <Spinner />
        ) : image ? (
          <img src={url} alt={`Arquivo ${doc.name}`} className="max-h-[60vh] w-full object-contain" />
        ) : (
          <iframe src={url} title={doc.name} className="h-[60vh] w-full" />
        )}
      </div>
    </div>
  );
}

/**
 * Picks and sends a file right away, so the form only carries its id. The server
 * checks the content; this only spares a round trip for obvious mistakes.
 */
export function DocumentPicker({
  restaurantId,
  kind,
  token,
  value,
  onChange,
  invalid,
}: {
  restaurantId: string;
  kind: DocumentView['kind'];
  token: string;
  value: DocumentView | null;
  onChange: (doc: DocumentView | null) => void;
  invalid?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (file: File) => {
    setError(null);
    if (file.size > DOCUMENT_LIMITS.maxBytes) return setError(UPLOAD_ERRORS.file_too_large);
    if (!(DOCUMENT_LIMITS.types as readonly string[]).includes(file.type)) return setError(UPLOAD_ERRORS.unsupported_document);
    setBusy(true);
    try {
      onChange(await apiUpload<DocumentView>(`/api/admin/restaurants/${restaurantId}/documents`, file, token, { kind }));
    } catch (e) {
      setError(e instanceof ApiError ? UPLOAD_ERRORS[e.code] ?? unexpected(e) : unexpected(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {value ? (
        <div className={`surface flex items-center gap-3 px-3.5 py-2.5 text-sm ${invalid ? 'border-danger' : ''}`}>
          <Paperclip size={16} className="shrink-0 text-brand" />
          <span className="min-w-0 flex-1 truncate font-medium">{value.name}</span>
          <span className="shrink-0 text-muted">{fileSize(value.bytes)}</span>
          <button type="button" onClick={() => onChange(null)} aria-label="Tirar o arquivo" className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger">
            <X size={15} />
          </button>
        </div>
      ) : (
        <Button type="button" variant="ghost" loading={busy} onClick={() => input.current?.click()} className={invalid ? '!border-danger' : ''}>
          <Upload size={16} /> Escolher arquivo
        </Button>
      )}
      <p className="text-xs text-muted">PDF, JPG, PNG ou WebP, até 10 MB.</p>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <input
        ref={input}
        type="file"
        accept={DOCUMENT_LIMITS.types.join(',')}
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
