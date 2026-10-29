import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider, themeInitScript } from '@elo/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elo Cardápio',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Elo', statusBarStyle: 'default' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
