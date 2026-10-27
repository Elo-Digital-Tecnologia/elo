'use client';

import { BellRing, Check, ChefHat, QrCode, ScanLine, Send, ShieldCheck, Soup, Timer, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Aurora, Badge, GlassCard, Logo, motion, Stagger, StaggerItem, ThemeToggle } from '@elo/ui';

const STEPS = [
  { icon: ScanLine, title: 'Escaneia', text: 'O cliente encosta o celular na tag NFC ou lê o QR Code da mesa.' },
  { icon: Smartphone, title: 'Escolhe', text: 'Monta o pedido com tamanhos, adicionais e observações.' },
  { icon: ShieldCheck, title: 'Garçom valida', text: 'A mesa só abre depois que o garçom confirma. Sem pedidos de fora.' },
  { icon: ChefHat, title: 'Cozinha recebe', text: 'A comanda aparece na tela da cozinha no mesmo instante.' },
];

const TRACK = [
  { label: 'Enviado', icon: Send },
  { label: 'Recebido', icon: ChefHat },
  { label: 'Em preparo', icon: Soup },
  { label: 'Pronto', icon: Check },
];

/** Mostra, em loop, o que o cliente vê depois de enviar a comanda. */
function PhoneDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 5), 1900);
    return () => clearInterval(t);
  }, []);
  const at = Math.min(step, 3);

  return (
    <div className="relative mx-auto w-[300px]">
      <motion.div className="glass glass-strong !rounded-[44px] p-4" animate={{ rotate: [-2, 1.5, -2] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="rounded-[32px] bg-bg/60 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <Logo />
            <Badge tone="brand">Mesa 07</Badge>
          </div>
          <div className="font-display text-2xl font-extrabold leading-tight">Pizzaria Casa Verde</div>
          <div className="glass mt-4 !rounded-lg p-3.5">
            <ul className="mb-3 text-sm">
              <li><b>2x</b> Margherita <span className="text-muted">· G</span></li>
              <li><b>1x</b> Suco de limão</li>
            </ul>
            <ol className="relative grid grid-cols-4">
              <span className="absolute left-[12.5%] right-[12.5%] top-[17px] h-1 rounded-pill bg-leaf-200/70" />
              <motion.span className="absolute left-[12.5%] top-[17px] h-1 rounded-pill bg-brand" animate={{ width: `${(at / 3) * 75}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
              {TRACK.map((s, i) => {
                const Icon = s.icon;
                const on = i <= at;
                return (
                  <li key={s.label} className="relative flex flex-col items-center gap-1.5">
                    <span className={`relative grid h-[34px] w-[34px] place-items-center rounded-pill transition-colors duration-500 ${on ? 'btn-glass' : 'bg-leaf-100 text-muted'}`}>
                      <Icon size={15} />
                      {i === at && at < 3 && <span className="absolute inset-0 animate-ping rounded-pill bg-brand/40" />}
                    </span>
                    <span className={`text-[10px] font-semibold ${on ? 'text-fg' : 'text-muted'}`}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="btn-glass mt-4 flex items-center justify-center gap-2 rounded-pill py-3 text-sm font-semibold"><BellRing size={16} /> Chamar garçom</div>
        </div>
      </motion.div>
      <motion.div className="glass absolute -left-14 top-24 hidden w-44 !rounded-lg p-3 sm:block" animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="flex items-center gap-2 text-xs"><span className="pulse-dot" /> <b>Cozinha</b></div>
        <div className="mt-1 text-sm">Mesa 07 · novo pedido</div>
      </motion.div>
      <motion.div className="glass absolute -right-10 bottom-16 hidden w-44 !rounded-lg p-3 sm:block" animate={{ y: [0, 10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
        <div className="flex items-center gap-2 text-xs"><Timer size={14} className="text-brand" /> <b>Tempo real</b></div>
        <div className="mt-1 text-sm">Sem recarregar a tela</div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-dvh">
      <Aurora />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo sub="Cardápio" />
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="grid items-center gap-14 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <motion.h1 className="text-5xl font-extrabold leading-[0.98] sm:text-7xl" initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
              O pedido sai da mesa e chega na cozinha.
            </motion.h1>
            <motion.p className="mt-6 max-w-lg text-lg text-muted" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
              Elo Cardápio liga o cliente, o garçom e a cozinha. Cada mesa tem um QR Code e uma tag NFC próprios, e o salão inteiro acompanha tudo ao vivo.
            </motion.p>
            <motion.div className="mt-8 flex flex-wrap items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <GlassCard className="inline-flex items-center gap-3 !rounded-pill py-2.5 pl-3 pr-6">
                <span className="btn-glass grid h-10 w-10 place-items-center rounded-pill"><QrCode size={20} /></span>
                <span className="text-sm leading-tight"><b>Já tem uma mesa?</b><br /><span className="text-muted">Escaneie o QR Code ou encoste o celular na tag.</span></span>
              </GlassCard>
            </motion.div>
          </div>
          <PhoneDemo />
        </section>

        <section className="py-14" aria-labelledby="como">
          <h2 id="como" className="mb-8 max-w-xl text-4xl font-extrabold sm:text-5xl">Do QR Code ao prato, em quatro passos.</h2>
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <StaggerItem key={s.title}>
                <GlassCard lift className="relative h-full p-6">
                  <span className="font-display text-6xl font-extrabold text-brand/25">{i + 1}</span>
                  <span className="btn-glass mb-4 mt-2 grid h-12 w-12 place-items-center rounded-pill"><s.icon size={22} /></span>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{s.text}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className="py-14">
          <GlassCard strong className="grid gap-8 !rounded-xl p-8 sm:p-12 lg:grid-cols-3">
            {[
              ['Sem app para baixar', 'O cardápio abre direto no navegador do cliente.'],
              ['Mesa protegida', 'Um token que não dá para adivinhar e sessão que acaba quando o garçom fecha a mesa.'],
              ['Para pizzarias, hamburguerias e pastelarias', 'Tamanhos, adicionais e observações definidos por você.'],
            ].map(([t, d]) => (
              <div key={t}><h3 className="text-xl font-bold">{t}</h3><p className="mt-2 text-muted">{d}</p></div>
            ))}
          </GlassCard>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-6 pt-10">
        <div className="glass flex flex-wrap items-center justify-between gap-3 !rounded-pill px-6 py-3 text-xs text-muted">
          <Logo />
          <span>© {new Date().getFullYear()} Elo Digital</span>
        </div>
      </footer>
    </div>
  );
}
