'use client';

import { Check, Copy, Download, Plus, Table2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import type { TableView } from '@elo/core';
import { Badge, Button, EmptyState, ErrorState, Field, GlassCard, Modal, PageHeader, SkeletonCards, Stagger, StaggerItem } from '@elo/ui';
import { Shell, useStaff } from '../../_components/shell';

const STATE: Record<string, { label: string; tone: 'neutral' | 'warning' | 'success' }> = {
  closed: { label: 'Livre', tone: 'neutral' },
  pending_open: { label: 'Aguardando garçom', tone: 'warning' },
  open: { label: 'Aberta', tone: 'success' },
  pending_close: { label: 'Pediu a conta', tone: 'warning' },
};

function TableCard({ table, slug, token, onRemove }: { table: TableView; slug: string; token: string; onRemove: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(location.origin), []);
  const link = `${origin}/${slug}/${table.token}`;

  useEffect(() => {
    let url: string | undefined;
    fetch(`/api/tables/${table.id}/qr`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((b) => {
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [table.id, token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sem permissão de área de transferência */
    }
  };

  return (
    <GlassCard lift className="flex flex-col items-center gap-4 p-5 text-center">
      <div className="flex w-full items-center justify-between gap-2">
        <h3 className="font-display text-xl font-bold">{table.name}</h3>
        <Badge tone={STATE[table.state].tone} dot>{STATE[table.state].label}</Badge>
      </div>
      <div className="grid aspect-square w-full max-w-[200px] place-items-center rounded-lg bg-white p-3 shadow-inner">
        {src ? <img src={src} alt={`QR Code da ${table.name}`} className="h-full w-full" /> : <div className="skeleton h-full w-full" />}
      </div>
      <div className="flex w-full flex-wrap justify-center gap-2">
        <Button variant="soft" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar link'}</Button>
        {src && <a href={src} download={`${table.name}.png`} className="glass inline-flex items-center gap-2 !rounded-pill px-5 py-2.5 text-sm font-semibold transition hover:text-brand"><Download size={16} /> Baixar</a>}
        <button aria-label={`Remover ${table.name}`} onClick={onRemove} className="grid h-10 w-10 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger"><Trash2 size={17} /></button>
      </div>
    </GlassCard>
  );
}

function View() {
  const { token, me } = useStaff();
  const [tables, setTables] = useState<TableView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTables(await api<TableView[]>('/api/tables', { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api('/api/tables', { body: { name: name.trim() }, token });
    setName('');
    setOpen(false);
    await load();
  };

  const remove = async (t: TableView) => {
    setError(null);
    try {
      await api(`/api/tables/${t.id}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? 'Uma mesa em uso não pode ser removida. Feche a mesa antes.' : 'Não foi possível remover a mesa.');
    }
  };

  return (
    <>
      <PageHeader title="Mesas e QR Codes" description="QR Code e tag NFC de cada mesa." actions={<Button onClick={() => setOpen(true)}><Plus size={17} /> Nova mesa</Button>} />
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar as mesas.</ErrorState>}
      {!tables && !failed && <SkeletonCards count={3} />}
      {tables?.length === 0 && <EmptyState icon={Table2} title="Nenhuma mesa cadastrada" action={<Button onClick={() => setOpen(true)}>Cadastrar mesa</Button>}>Crie uma mesa para gerar o QR Code que o cliente escaneia para pedir.</EmptyState>}
      <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {tables?.map((t) => (
          <StaggerItem key={t.id}><TableCard table={t} slug={me.slug} token={token} onRemove={() => remove(t)} /></StaggerItem>
        ))}
      </Stagger>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova mesa" sheet>
        <form onSubmit={create} className="space-y-4">
          <Field label="Nome da mesa"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mesa 01" required autoFocus /></Field>
          <div className="flex justify-end"><Button type="submit">Criar mesa</Button></div>
        </form>
      </Modal>
    </>
  );
}

export default function TablesPage() {
  return (
    <Shell roles={['restaurant_admin']}>
      <View />
    </Shell>
  );
}
