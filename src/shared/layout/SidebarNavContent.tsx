'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightlightIcon from '@mui/icons-material/Nightlight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import PWAInstallButton from '@/shared/pwa/PWAInstallButton';
import { sidebarIcons } from './sidebarIcons';

export interface SidebarData {
  darkMode: boolean;
  isMobile: boolean;
  isThemeAnimating: boolean;
  userDisplayName: string;
  userInitials: string;
  isSuperadmin: boolean;
  visibleMainMenus: ReadonlyArray<{ label: string; href: string }>;
  visibleSubMenus: ReadonlyArray<{ label: string; href: string; external?: boolean }>;
  isOptionsOpen: boolean;
  toggleTheme: () => void;
  toggleOptions: () => void;
  closeMobileMenu: () => void;
  closeDesktopMenu: () => void;
  handleLogout: () => void;
}

export function ThemeSwitch({
  darkMode,
  isThemeAnimating,
  compact = false,
  mobile = false,
  toggleTheme,
}: {
  darkMode: boolean;
  isThemeAnimating: boolean;
  compact?: boolean;
  mobile?: boolean;
  toggleTheme: () => void;
}) {
  const baseBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-emerald-500 border-emerald-400 text-white';
  const size = compact ? 'h-10 w-16 rounded-full' : 'h-11 w-full rounded-full';
  const animDuration = mobile ? 'duration-700' : 'duration-500';

  return (
    <button
      type='button' role='switch' aria-checked={darkMode} aria-label='Toggle dark mode'
      onClick={toggleTheme} disabled={isThemeAnimating} title='Toggle theme'
      className={`${baseBg} ${size} relative border transition-colors ${animDuration} ease-in-out overflow-hidden disabled:cursor-not-allowed disabled:opacity-85`}
    >
      <span aria-hidden='true' className='absolute inset-y-0 left-2 flex items-center opacity-90'><WbSunnyIcon fontSize='small' /></span>
      <span aria-hidden='true' className='absolute inset-y-0 right-2 flex items-center opacity-90'><NightlightIcon fontSize='small' /></span>
      <span
        style={{ left: darkMode ? 'calc(100% - 2.25rem)' : '0.25rem' }}
        className={`absolute top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-[left,transform] ${animDuration} ease-in-out`}
      >
        {darkMode ? <NightlightIcon fontSize='small' /> : <WbSunnyIcon fontSize='small' />}
      </span>
    </button>
  );
}

export function SidebarNavContent({
  data,
  onCloseMobile,
}: {
  data: SidebarData;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const { darkMode, visibleMainMenus, visibleSubMenus, isOptionsOpen, toggleOptions } = data;

  return (
    <>
      <div className='flex items-center justify-between gap-2 mb-6'>
        <div className='flex items-center gap-3 min-w-0'>
          <Image src={darkMode ? '/brand/planify-logo-outline.svg' : '/brand/planify-logo-primary.svg'} alt='Planify logo' width={34} height={34} priority className='rounded-lg' />
          <h2 className={`text-xl font-bold truncate ${darkMode ? 'text-slate-100' : 'text-white'}`}>Planify</h2>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          {data.isMobile && (
            <button type='button' className={`h-11 w-11 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-700 text-slate-100' : 'bg-emerald-500 text-white'}`}
              onClick={onCloseMobile} aria-label='Close menu'>
              <KeyboardDoubleArrowLeftIcon fontSize='medium' />
            </button>
          )}
          {!data.isMobile && (
            <button type='button' className={`h-11 w-11 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-700 text-slate-100' : 'bg-emerald-500 text-white'}`}
              onClick={data.closeDesktopMenu} aria-label='Close desktop sidebar'>
              <KeyboardDoubleArrowLeftIcon fontSize='medium' />
            </button>
          )}
        </div>
      </div>

      <div className='mb-3'><ThemeSwitch darkMode={darkMode} isThemeAnimating={data.isThemeAnimating} mobile={data.isMobile} toggleTheme={data.toggleTheme} /></div>
      {data.isMobile && (
        <div className='mb-4'><PWAInstallButton darkMode={darkMode} /></div>
      )}

      <div className={`mb-4 rounded-xl border px-3 py-3 ${darkMode ? 'bg-slate-700/60 border-slate-600' : 'bg-emerald-500/70 border-emerald-400'}`}>
        <div className='flex items-center gap-3 min-w-0'>
          <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-slate-200 text-slate-800' : 'bg-white text-emerald-700'}`} aria-label='Profile initials'>
            {data.userInitials}
          </div>
          <div className='min-w-0'>
            <p className={`truncate text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-white'}`}>{data.userDisplayName}</p>
            <p className={`truncate text-xs ${darkMode ? 'text-slate-300' : 'text-emerald-50'}`}>{data.isSuperadmin ? 'Superadmin' : 'Member'}</p>
          </div>
        </div>
      </div>

      <div className={`h-px mb-4 ${darkMode ? 'bg-slate-600' : 'bg-emerald-400'}`} aria-hidden='true' />

      <nav className='flex-1 overflow-y-auto'>
        <ul className='space-y-4'>
          {visibleMainMenus.map(({ label, href }) => {
            type SidebarLabel = keyof typeof sidebarIcons;
            const Icon = sidebarIcons[label as SidebarLabel];
            const isActive = pathname === href;
            return (
              <li key={label}>
                <Link href={href} onClick={onCloseMobile}
                  className={`font-medium flex items-center gap-2 rounded px-3 py-3 transition-colors ${darkMode
                    ? isActive ? 'bg-slate-700 text-white font-bold' : 'text-slate-100 hover:text-slate-300'
                    : isActive ? 'bg-emerald-500 text-white font-bold' : 'text-emerald-50 hover:text-white'}`}
                  aria-current={isActive ? 'page' : undefined}>
                  {Icon && <Icon fontSize='small' className='-ml-1' />}{label}
                </Link>
              </li>
            );
          })}
          {visibleSubMenus.length > 0 && (
            <li>
              <button type='button' onClick={toggleOptions}
                className={`w-full text-left font-medium text-sm flex items-center justify-between transition-colors px-1 ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-emerald-100 hover:text-white'}`}
                aria-expanded={isOptionsOpen} aria-controls='options-submenu'>
                <span>Options</span><span>{isOptionsOpen ? '−' : '+'}</span>
              </button>
              {isOptionsOpen && (
                <ul id='options-submenu' className='mt-2 space-y-2 pl-3'>
                  {visibleSubMenus.map(({ label, href, external }) => {
                    type SidebarLabel = keyof typeof sidebarIcons;
                    const Icon = sidebarIcons[label as SidebarLabel];
                    const isActive = pathname === href;
                    const linkClass = `font-medium flex items-center gap-2 rounded px-3 py-3 transition-colors ${darkMode
                      ? isActive ? 'bg-slate-700 text-white font-bold' : 'text-slate-100 hover:text-slate-300'
                      : isActive ? 'bg-emerald-500 text-white font-bold' : 'text-emerald-50 hover:text-white'}`;

                    return (
                      <li key={label}>
                        {external ? (
                          <a href={href} target='_blank' rel='noreferrer' onClick={onCloseMobile} className={linkClass}>
                            {Icon && <Icon fontSize='small' className='-ml-1' />}{label}
                          </a>
                        ) : (
                          <Link href={href} onClick={onCloseMobile} className={linkClass} aria-current={isActive ? 'page' : undefined}>
                            {Icon && <Icon fontSize='small' className='-ml-1' />}{label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>

      <div className={`mt-4 pt-3 border-t text-xs text-center space-y-3 ${darkMode ? 'text-slate-400 border-slate-600' : 'text-emerald-100 border-emerald-400'}`}>
        <button type='button' onClick={() => void data.handleLogout()}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${darkMode ? 'border-slate-500 text-slate-100 hover:bg-slate-700' : 'border-emerald-200 text-white hover:bg-emerald-500'}`}>
          Logout
        </button>
        <br />&copy; {new Date().getFullYear()} Planify
      </div>
    </>
  );
}
