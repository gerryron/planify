'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarNavContent, type SidebarData } from './SidebarNavContent';
import { sidebarIcons } from './sidebarIcons';

interface SidebarDesktopProps {
  data: SidebarData;
  isDesktopOpen: boolean;
  openDesktop: () => void;
}

export default function SidebarDesktop({ data, isDesktopOpen, openDesktop }: SidebarDesktopProps) {
  const pathname = usePathname();
  const { darkMode, visibleMainMenus, visibleSubMenus, userDisplayName, userInitials } = data;
  const containerClass = darkMode ? 'bg-slate-800 text-slate-100' : 'bg-emerald-600 text-white border-r border-emerald-700';

  return (
    <aside className={`hidden md:flex h-screen sticky top-0 left-0 shadow-lg flex-col transition-all duration-300 ease-out overflow-hidden ${containerClass} ${
      isDesktopOpen ? 'w-64 p-6' : 'w-20 p-3'
    }`}>
      {isDesktopOpen ? (
        <SidebarNavContent data={data} />
      ) : (
        <>
          <div className='flex items-center justify-center w-full mb-4'>
            <button type='button' className='h-10 w-10 flex items-center justify-center overflow-visible' onClick={openDesktop}
              aria-label='Open desktop sidebar' title='Open sidebar'>
              <Image src={darkMode ? '/brand/planify-logo-outline.svg' : '/brand/planify-logo-primary.svg'} alt='Open menu' width={30} height={30} />
            </button>
          </div>

          <div className='mb-4 flex justify-center'>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-slate-200 text-slate-800' : 'bg-white text-emerald-700'}`}
              title={userDisplayName} aria-label={`Profile ${userDisplayName}`}>
              {userInitials}
            </div>
          </div>

          <nav className='flex-1 overflow-y-auto w-full'>
            <ul className='space-y-2'>
              {visibleMainMenus.map(({ label, href }) => {
                type SidebarLabel = keyof typeof sidebarIcons;
                const Icon = sidebarIcons[label as SidebarLabel];
                const isActive = pathname === href;
                return (
                  <li key={label}>
                    <Link href={href}
                      className={`h-10 w-10 mx-auto rounded-lg flex items-center justify-center transition-colors ${darkMode
                        ? isActive ? 'bg-slate-700 text-white' : 'text-slate-100 hover:text-slate-300'
                        : isActive ? 'bg-emerald-500 text-white' : 'text-emerald-50 hover:text-white'}`}
                      aria-current={isActive ? 'page' : undefined} aria-label={label} title={label}>
                      {Icon && <Icon fontSize='small' />}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {visibleSubMenus.length > 0 && (
              <>
                <div className={`h-px my-3 mx-2 ${darkMode ? 'bg-slate-600' : 'bg-emerald-400'}`} aria-hidden='true' />
                <ul className='space-y-2'>
                  {visibleSubMenus.map(({ label, href, external }) => {
                    type SidebarLabel = keyof typeof sidebarIcons;
                    const Icon = sidebarIcons[label as SidebarLabel];
                    const isActive = pathname === href;
                    const linkClass = `h-10 w-10 mx-auto rounded-lg flex items-center justify-center transition-colors ${darkMode
                      ? isActive ? 'bg-slate-700 text-white' : 'text-slate-100 hover:text-slate-300'
                      : isActive ? 'bg-emerald-500 text-white' : 'text-emerald-50 hover:text-white'}`;

                    return (
                      <li key={label}>
                        {external ? (
                          <a href={href} target='_blank' rel='noreferrer' className={linkClass} aria-label={label} title={label}>
                            {Icon && <Icon fontSize='small' />}
                          </a>
                        ) : (
                          <Link href={href} className={linkClass} aria-current={isActive ? 'page' : undefined} aria-label={label} title={label}>
                            {Icon && <Icon fontSize='small' />}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </nav>
        </>
      )}
    </aside>
  );
}
