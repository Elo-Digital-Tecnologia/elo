import type { Metadata } from 'next';
import { Inter, Playfair_Display_SC } from 'next/font/google';
import '@/app/globals.css';
import { Providers } from './providers';

// next/font/google loaders must be called statically at module scope;
// Next.js analyzes this call at build time and cannot handle conditional
// or require()-based invocations.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  preload: false,
});

const playfair = Playfair_Display_SC({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '700'],
  preload: false,
});

export const metadata: Metadata = {
  title: 'Elo Digital - Admin',
  description: 'Painel administrativo da plataforma Elo Digital'
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
