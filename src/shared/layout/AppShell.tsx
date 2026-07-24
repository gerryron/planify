'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '@/features/auth/services/authService';
import Sidebar from '@/shared/layout/Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage =
    pathname === '/' || pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!isAuthPage) return;

    // Auth screens are designed with light surfaces.
    document.documentElement.classList.remove('dark');
  }, [isAuthPage]);

  useEffect(() => {
    if (isAuthPage) return;

    let mounted = true;

    const checkSession = async () => {
      try {
        const data = await authService.me();
        if (!mounted) return;

        const isAdminPanelPath = pathname.startsWith('/admin-panel');
        if (data.user.role === 'superadmin' && !isAdminPanelPath) {
          router.replace('/admin-panel');
          return;
        }

        if (data.user.role !== 'superadmin' && isAdminPanelPath) {
          router.replace('/home');
          return;
        }
      } catch {
        if (!mounted) return;
        router.replace('/');
      }
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [isAuthPage, router, pathname]);

  if (isAuthPage) {
    return <main className='min-h-screen'>{children}</main>;
  }

  return (
    <div className='flex min-h-screen'>
      <Sidebar />
      <main className='flex-1 min-w-0 p-4 pt-20 sm:p-6 sm:pt-24 md:p-8 lg:p-10'>
        <div key={pathname} className='app-route-transition'>
          {children}
        </div>
      </main>
    </div>
  );
}
