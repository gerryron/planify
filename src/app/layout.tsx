import './globals.css';
import Sidebar from '@/shared/layout/Sidebar';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planify',
  icons: {
    icon: '/brand/planify-logo-primary.svg',
    shortcut: '/brand/planify-logo-primary.svg',
    apple: '/brand/planify-logo-primary.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <ThemeProvider />
        <div className='flex'>
          <Sidebar />
          <main className='flex-1 p-10'>{children}</main>
        </div>
      </body>
    </html>
  );
}
