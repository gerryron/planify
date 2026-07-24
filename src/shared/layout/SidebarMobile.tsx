'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';
import PWAInstallButton from '@/shared/pwa/PWAInstallButton';
import { SidebarNavContent, type SidebarData } from './SidebarNavContent';

interface SidebarMobileProps {
  data: SidebarData;
  isMobileOpen: boolean;
  queueCount: number;
  openMobile: () => void;
  closeMobile: () => void;
}

export default function SidebarMobile({
  data,
  isMobileOpen,
  queueCount,
  openMobile,
  closeMobile,
}: SidebarMobileProps) {
  const { darkMode } = data;

  return (
    <>
      {/* Mobile header */}
      <header className={`md:hidden fixed top-0 left-0 right-0 z-40 h-16 border-b px-4 flex items-center justify-between ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-emerald-600 border-emerald-700'}`}>
        <div className='flex items-center gap-2'>
          <Image src={darkMode ? '/brand/planify-logo-outline.svg' : '/brand/planify-logo-primary.svg'} alt='Planify logo' width={28} height={28} priority className='rounded-md' />
          <span className='font-semibold'>Planify</span>
        </div>
        <div className='flex items-center gap-2'>
          <PWAInstallButton darkMode={darkMode} compact />
          <div className='relative'>
            <button type='button' onClick={openMobile} aria-label='Open menu' aria-expanded={isMobileOpen} aria-controls='mobile-sidebar'
              className={`h-11 w-11 rounded-lg flex items-center justify-center ${darkMode ? 'text-slate-100 bg-slate-700' : 'text-white bg-emerald-500'}`}>
              <Menu size={16} />
            </button>
            {queueCount > 0 && (
              <span className='absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white flex items-center justify-center'>
                {queueCount > 99 ? '99+' : queueCount}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <button type='button' className='md:hidden fixed inset-0 z-40 bg-black/50' aria-label='Close sidebar overlay' onClick={closeMobile} />
      )}

      {/* Mobile sidebar */}
      <aside id='mobile-sidebar'
        className={`md:hidden fixed top-0 left-0 z-50 h-screen w-72 max-w-[85vw] px-5 pt-5 pb-8 shadow-xl transition-transform duration-300 flex flex-col overflow-y-auto ${
          darkMode ? 'bg-slate-800 text-slate-100' : 'bg-emerald-600 text-white border-r border-emerald-700'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarNavContent data={data} onCloseMobile={closeMobile} />
      </aside>
    </>
  );
}
