import './globals.css';
import Sidebar from '@/shared/layout/Sidebar';
import PWARegister from '@/shared/pwa/PWARegister';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Planify',
  description:
    'Aplikasi pencatatan cash flow harian dan pengelolaan budget bulanan.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <PWARegister />
        <ThemeProvider />
        <div className='flex min-h-screen'>
          <Sidebar />
          <main className='flex-1 min-w-0 p-4 pt-20 sm:p-6 sm:pt-24 md:p-8 lg:p-10'>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
