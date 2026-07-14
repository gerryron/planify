import './globals.css';
import { ensureConfiguredSuperadmin } from '@/core/auth/ensureSuperadmin';
import AppShell from '@/shared/layout/AppShell';
import QueryProvider from '@/shared/providers/QueryProvider';
import PWARegister from '@/shared/pwa/PWARegister';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Planify',
  description: 'A daily cash flow tracking and monthly budgeting application.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Planify',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/brand/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/pwa-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/brand/pwa-192.png',
    apple: [{ url: '/brand/pwa-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#059669',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureConfiguredSuperadmin();

  return (
    <html lang='en'>
      <body>
        <PWARegister />
        <ThemeProvider />
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
