'use client';

import { Check, Copy, Instagram, MapPin, Phone, Wifi } from 'lucide-react';
import { useState } from 'react';
import type { RestaurantProfileView } from '@elo/core';

type Profile = RestaurantProfileView & { wifi?: { name: string | null; password: string | null } | null };

const chip = 'inline-flex items-center gap-1.5 rounded-pill border border-line/60 px-3 py-1.5 text-sm font-medium transition hover:border-brand/60 hover:text-brand';

function CopyWifi({ password }: { password: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(password).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }).catch(() => undefined);
      }}
      className="inline-flex items-center gap-1.5 rounded-pill bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg transition active:scale-95"
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? 'Copiada' : 'Copiar senha'}
    </button>
  );
}

/** Descrição, aberto/fechado, contatos e Wi-Fi. Não mostra nada que o restaurante não preencheu. */
export function RestaurantInfo({ profile }: { profile: Profile }) {
  const { description, openStatus, address, phone, instagram, wifi } = profile;
  const handle = instagram?.replace(/^@/, '');
  if (!description && !openStatus && !address && !phone && !handle && !wifi) return null;
  return (
    <section aria-label="Sobre o restaurante" className="space-y-3 px-4 pt-3">
      {description && <p className="text-[15px] leading-relaxed">{description}</p>}
      <div className="flex flex-wrap gap-2">
        {openStatus && (
          <span className="inline-flex items-center gap-2 rounded-pill bg-brand/10 px-3 py-1.5 text-sm font-semibold">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${openStatus.open ? 'bg-success' : 'bg-danger'}`} />
            {openStatus.label}
          </span>
        )}
        {address && (
          <a className={chip} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
            <MapPin size={15} /> {address}
          </a>
        )}
        {phone && (
          <a className={chip} href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
            <Phone size={15} /> {phone}
          </a>
        )}
        {handle && (
          <a className={chip} href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer">
            <Instagram size={15} /> @{handle}
          </a>
        )}
      </div>
      {wifi && (wifi.name || wifi.password) && (
        <div className="surface flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
          <Wifi size={18} className="text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            {wifi.name && <div className="font-semibold">{wifi.name}</div>}
            {wifi.password && <div className="break-all text-muted">Senha: {wifi.password}</div>}
          </div>
          {wifi.password && <CopyWifi password={wifi.password} />}
        </div>
      )}
    </section>
  );
}
