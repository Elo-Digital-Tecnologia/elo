import type { Metadata } from 'next';
import { Inter, Playfair_Display_SC } from 'next/font/google';
import '@/app/globals.css';
import { Providers } from './providers';

const isDev = process.env.NODE_ENV === 'development';

let inter: { variable: string; className: string };
let playfair: { variable: string; className: string };

if (isDev) {
  inter = { variable: '--font-body', className: '' };
  playfair = { variable: '--font-display', className: '' };
} else {
  const InterFont = require('next/font/google').Inter;
  const PlayfairDisplaySC = require('next/font/google').Playfair_Display_SC;
  
  const interFont = InterFont({
    subsets: ['latin'],
    variable: '--font-body',
    display: 'swap',
    preload: false,
  });
  
  const playfairFont = PlayfairDisplaySC({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap',
    weight: ['400', '700'],
    preload: false,
  });
  
  inter = { variable: interFont.variable, className: interFont.className };
  playfair = { variable: playfairFont.variable, className: playfairFont.className };
}

export const metadata: Metadata = {
  title: 'Elo Digital - Cozinha',
  description: 'Tela de pedidos da cozinha'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <body className={`${inter.className} ${playfair.className} min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}