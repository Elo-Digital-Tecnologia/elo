import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { UiTextsProvider } from '@elo/ui/texts/ui-texts';
import { ThemeProvider } from '@elo/ui/theme/theme';
import { themeInitScript } from '@elo/ui/theme/theme-script';
import { UI_TEXTS } from '#/_lib/messages/ui';

import './globals.css';

export const metadata: Metadata = {
    title: 'Elo Cardápio',
    icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
    appleWebApp: { capable: true, title: 'Elo', statusBarStyle: 'default' }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="pt-BR" data-theme="light" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </head>
            <body>
                <UiTextsProvider texts={UI_TEXTS}>
                    <ThemeProvider>{children}</ThemeProvider>
                </UiTextsProvider>
            </body>
        </html>
    );
}
