'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightlightIcon from '@mui/icons-material/Nightlight';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import PWAInstallButton from '@/shared/pwa/PWAInstallButton';
import { getQueuedWriteCount } from '@/shared/pwa/writeQueueClient';
import { authService, SessionUser } from '@/features/auth/services/authService';
import { sidebarIcons } from './sidebarIcons';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const themeAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const THEME_SWITCH_ANIMATION_MS_DESKTOP = 460;
  const THEME_SWITCH_ANIMATION_MS_MOBILE = 760;

  const mainMenus = [
    { label: 'Home', href: '/home' },
    { label: 'Monthly Budget', href: '/monthly-budget' },
    { label: 'Cash Log', href: '/cash-log' },
  ] as const;

  const adminOnlyMenus = [
    { label: 'Admin Panel', href: '/admin-panel' },
  ] as const;

  const isDevelopment = process.env.NODE_ENV === 'development';

  const subMenusBase = [
    { label: 'Wallets', href: '/wallets' },
    { label: 'Categories', href: '/categories' },
    { label: 'Settings', href: '/settings' },
  ] as const;

  const subMenus = [
    ...subMenusBase,
    ...(isDevelopment
      ? [{ label: 'Swagger', href: 'http://localhost:3010', external: true }]
      : []),
  ] as const;

  const isSuperadmin = sessionUser?.role === 'superadmin';
  const visibleMainMenus = isSuperadmin ? adminOnlyMenus : mainMenus;
  const visibleSubMenus = isSuperadmin ? [] : subMenus;
  const userDisplayName = sessionUser?.name?.trim() || 'User';
  const userInitials =
    userDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';

  const syncThemeClass = (isDark: boolean) => {
    const method = isDark ? 'add' : 'remove';
    document.documentElement.classList[method]('dark');
    document.body.classList[method]('theme-dark');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Defer setState to avoid cascading renders
    requestAnimationFrame(() => {
      setMounted(true);
      const isDark = localStorage.getItem('darkMode') === 'true';
      const desktopSidebarOpen = localStorage.getItem('desktopSidebarOpen');
      syncThemeClass(isDark);
      setDarkMode(isDark);
      if (desktopSidebarOpen !== null) {
        setIsDesktopOpen(desktopSidebarOpen === 'true');
      }
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const data = await authService.me();
        if (!mounted) return;
        setSessionUser(data.user);
      } catch {
        if (!mounted) return;
        setSessionUser(null);
      }
    };

    void loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    syncThemeClass(darkMode);
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('desktopSidebarOpen', isDesktopOpen.toString());
  }, [isDesktopOpen, mounted]);

  useEffect(() => {
    return () => {
      if (themeAnimationTimerRef.current) {
        clearTimeout(themeAnimationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    const refreshQueueCount = async () => {
      try {
        const count = await getQueuedWriteCount();
        if (!mounted) return;
        setQueueCount(count);
      } catch {
        if (!mounted) return;
        setQueueCount(0);
      }
    };

    const onOnline = () => {
      void refreshQueueCount();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshQueueCount();
      }
    };

    void refreshQueueCount();
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!mounted) return null;

  const containerClass = darkMode
    ? 'bg-slate-800 text-slate-100'
    : 'bg-emerald-600 text-white border-r border-emerald-700';

  const getThemeAnimationDuration = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return THEME_SWITCH_ANIMATION_MS_MOBILE;
    }

    return THEME_SWITCH_ANIMATION_MS_DESKTOP;
  };

  const toggleTheme = () => {
    if (isThemeAnimating) return;
    const animationMs = getThemeAnimationDuration();
    setIsThemeAnimating(true);
    setDarkMode((value) => !value);

    if (themeAnimationTimerRef.current) {
      clearTimeout(themeAnimationTimerRef.current);
    }

    themeAnimationTimerRef.current = setTimeout(() => {
      setIsThemeAnimating(false);
      themeAnimationTimerRef.current = null;
    }, animationMs);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  const closeDesktopMenu = () => {
    setIsDesktopOpen(false);
  };

  const openDesktopMenu = () => {
    setIsDesktopOpen(true);
  };

  const renderThemeSwitch = (compact = false, mobile = false) => (
    <button
      type='button'
      role='switch'
      aria-checked={darkMode}
      aria-label='Toggle dark mode'
      onClick={toggleTheme}
      disabled={isThemeAnimating}
      className={
        (darkMode
          ? 'bg-slate-700 border-slate-600 text-slate-100'
          : 'bg-emerald-500 border-emerald-400 text-white') +
        (compact ? ' h-10 w-16 rounded-full' : ' h-11 w-full rounded-full') +
        (mobile
          ? ' relative border transition-colors duration-700 ease-in-out overflow-hidden disabled:cursor-not-allowed disabled:opacity-85'
          : ' relative border transition-colors duration-500 ease-in-out overflow-hidden disabled:cursor-not-allowed disabled:opacity-85')
      }
      title='Toggle theme'
    >
      <span
        aria-hidden='true'
        className='absolute inset-y-0 left-2 flex items-center opacity-90'
      >
        <WbSunnyIcon fontSize='small' />
      </span>
      <span
        aria-hidden='true'
        className='absolute inset-y-0 right-2 flex items-center opacity-90'
      >
        <NightlightIcon fontSize='small' />
      </span>
      <span
        style={{ left: darkMode ? 'calc(100% - 2.25rem)' : '0.25rem' }}
        className={
          mobile
            ? 'absolute top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-[left,transform] duration-700 ease-in-out'
            : 'absolute top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-[left,transform] duration-500 ease-in-out'
        }
      >
        {darkMode ? (
          <NightlightIcon fontSize='small' />
        ) : (
          <WbSunnyIcon fontSize='small' />
        )}
      </span>
    </button>
  );

  const renderNavContent = (isMobile: boolean) => (
    <>
      <div className='flex items-center justify-between gap-2 mb-6'>
        <div className='flex items-center gap-3 min-w-0'>
          <Image
            src={
              darkMode
                ? '/brand/planify-logo-outline.svg'
                : '/brand/planify-logo-primary.svg'
            }
            alt='Planify logo'
            width={34}
            height={34}
            priority
            className='rounded-lg'
          />
          <h2
            className={
              darkMode
                ? 'text-xl font-bold text-slate-100 truncate'
                : 'text-xl font-bold text-white truncate'
            }
          >
            Planify
          </h2>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          {isMobile && (
            <button
              type='button'
              className={
                darkMode
                  ? 'bg-slate-700 text-slate-100 h-11 w-11 rounded-lg flex items-center justify-center'
                  : 'bg-emerald-500 text-white h-11 w-11 rounded-lg flex items-center justify-center'
              }
              onClick={closeMobileMenu}
              aria-label='Close menu'
            >
              <KeyboardDoubleArrowLeftIcon fontSize='medium' />
            </button>
          )}
          {!isMobile && (
            <button
              type='button'
              className={
                darkMode
                  ? 'bg-slate-700 text-slate-100 h-11 w-11 rounded-lg flex items-center justify-center'
                  : 'bg-emerald-500 text-white h-11 w-11 rounded-lg flex items-center justify-center'
              }
              onClick={closeDesktopMenu}
              aria-label='Close desktop sidebar'
            >
              <KeyboardDoubleArrowLeftIcon fontSize='medium' />
            </button>
          )}
        </div>
      </div>

      <div className='mb-3'>{renderThemeSwitch(false, isMobile)}</div>
      {isMobile && (
        <div className='mb-4'>
          <PWAInstallButton darkMode={darkMode} />
        </div>
      )}

      <div
        className={
          (darkMode
            ? 'bg-slate-700/60 border-slate-600'
            : 'bg-emerald-500/70 border-emerald-400') +
          ' mb-4 rounded-xl border px-3 py-3'
        }
      >
        <div className='flex items-center gap-3 min-w-0'>
          <div
            className={
              (darkMode
                ? 'bg-slate-200 text-slate-800'
                : 'bg-white text-emerald-700') +
              ' h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold'
            }
            aria-label='Profile initials'
          >
            {userInitials}
          </div>
          <div className='min-w-0'>
            <p
              className={
                (darkMode ? 'text-slate-100' : 'text-white') +
                ' truncate text-sm font-semibold'
              }
            >
              {userDisplayName}
            </p>
            <p
              className={
                (darkMode ? 'text-slate-300' : 'text-emerald-50') +
                ' truncate text-xs'
              }
            >
              {isSuperadmin ? 'Superadmin' : 'Member'}
            </p>
          </div>
        </div>
      </div>

      <div
        className={
          (darkMode ? 'bg-slate-600' : 'bg-emerald-400') + ' h-px mb-4'
        }
        aria-hidden='true'
      />

      <nav className='flex-1 overflow-y-auto'>
        <ul className='space-y-4'>
          {visibleMainMenus.map(({ label, href }) => {
            type SidebarLabel = keyof typeof sidebarIcons;
            const Icon = sidebarIcons[label as SidebarLabel];
            const isActive = pathname === href;
            return (
              <li key={label}>
                <Link
                  href={href}
                  onClick={closeMobileMenu}
                  className={
                    (darkMode
                      ? isActive
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-100 hover:text-slate-300'
                      : isActive
                        ? 'bg-emerald-500 text-white font-bold'
                        : 'text-emerald-50 hover:text-white') +
                    ' font-medium flex items-center gap-2 rounded px-3 py-3 transition-colors'
                  }
                  aria-current={isActive ? 'page' : undefined}
                >
                  {Icon && <Icon fontSize='small' className='-ml-1' />}
                  {label}
                </Link>
              </li>
            );
          })}
          {visibleSubMenus.length > 0 && (
            <li>
              <button
                type='button'
                onClick={() => setIsOptionsOpen((value) => !value)}
                className={
                  (darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-emerald-100 hover:text-white') +
                  ' w-full text-left font-medium text-sm flex items-center justify-between transition-colors px-1'
                }
                aria-expanded={isOptionsOpen}
                aria-controls='options-submenu'
              >
                <span>Options</span>
                <span>{isOptionsOpen ? '−' : '+'}</span>
              </button>
              {isOptionsOpen && (
                <ul id='options-submenu' className='mt-2 space-y-2 pl-3'>
                  {visibleSubMenus.map(({ label, href }) => {
                    type SidebarLabel = keyof typeof sidebarIcons;
                    const Icon = sidebarIcons[label as SidebarLabel];
                    const isExternal =
                      typeof href === 'string' && href.startsWith('http');
                    const isActive = pathname === href;

                    return (
                      <li key={label}>
                        {isExternal ? (
                          <a
                            href={href}
                            target='_blank'
                            rel='noreferrer'
                            onClick={closeMobileMenu}
                            className={
                              (darkMode
                                ? 'text-slate-100 hover:text-slate-300'
                                : 'text-emerald-50 hover:text-white') +
                              ' font-medium flex items-center gap-2 rounded px-3 py-3 transition-colors'
                            }
                          >
                            {Icon && (
                              <Icon fontSize='small' className='-ml-1' />
                            )}
                            {label}
                          </a>
                        ) : (
                          <Link
                            href={href}
                            onClick={closeMobileMenu}
                            className={
                              (darkMode
                                ? isActive
                                  ? 'bg-slate-700 text-white font-bold'
                                  : 'text-slate-100 hover:text-slate-300'
                                : isActive
                                  ? 'bg-emerald-500 text-white font-bold'
                                  : 'text-emerald-50 hover:text-white') +
                              ' font-medium flex items-center gap-2 rounded px-3 py-3 transition-colors'
                            }
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {Icon && (
                              <Icon fontSize='small' className='-ml-1' />
                            )}
                            {label}
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

      <div
        className={
          (darkMode ? 'text-slate-400' : 'text-emerald-100') +
          ' mt-4 pt-3 border-t text-xs text-center space-y-3 ' +
          (darkMode ? 'border-slate-600' : 'border-emerald-400')
        }
      >
        <button
          type='button'
          onClick={() => void handleLogout()}
          className={
            (darkMode
              ? 'border-slate-500 text-slate-100 hover:bg-slate-700'
              : 'border-emerald-200 text-white hover:bg-emerald-500') +
            ' w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors'
          }
        >
          Logout
        </button>
        <br />© {new Date().getFullYear()} Planify
      </div>
    </>
  );

  return (
    <>
      <header
        className={
          (darkMode
            ? 'bg-slate-800 border-slate-700'
            : 'bg-emerald-600 border-emerald-700') +
          ' md:hidden fixed top-0 left-0 right-0 z-40 h-16 border-b px-4 flex items-center justify-between'
        }
      >
        <div className='flex items-center gap-2'>
          <Image
            src={
              darkMode
                ? '/brand/planify-logo-outline.svg'
                : '/brand/planify-logo-primary.svg'
            }
            alt='Planify logo'
            width={28}
            height={28}
            priority
            className='rounded-md'
          />
          <span className='font-semibold'>Planify</span>
        </div>
        <div className='flex items-center gap-2'>
          <PWAInstallButton darkMode={darkMode} compact />
          <div className='relative'>
            <button
              type='button'
              onClick={() => setIsMobileOpen(true)}
              className={
                (darkMode
                  ? 'text-slate-100 bg-slate-700'
                  : 'text-white bg-emerald-500') +
                ' h-11 w-11 rounded-lg flex items-center justify-center'
              }
              aria-label='Open menu'
              aria-expanded={isMobileOpen}
              aria-controls='mobile-sidebar'
            >
              <MenuIcon fontSize='small' />
            </button>
            {queueCount > 0 && (
              <span className='absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white flex items-center justify-center'>
                {queueCount > 99 ? '99+' : queueCount}
              </span>
            )}
          </div>
        </div>
      </header>

      {isMobileOpen && (
        <button
          type='button'
          className='md:hidden fixed inset-0 z-40 bg-black/50'
          aria-label='Close sidebar overlay'
          onClick={closeMobileMenu}
        />
      )}

      <aside
        id='mobile-sidebar'
        className={
          containerClass +
          ' md:hidden fixed top-0 left-0 z-50 h-screen w-72 max-w-[85vw] p-5 shadow-xl transition-transform duration-300 ' +
          (isMobileOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        {renderNavContent(true)}
      </aside>

      <aside
        className={
          containerClass +
          (isDesktopOpen
            ? ' hidden md:flex w-64 h-screen sticky top-0 left-0 shadow-lg flex-col p-6 transition-all duration-300 ease-out overflow-hidden'
            : ' hidden md:flex w-20 h-screen sticky top-0 left-0 shadow-lg p-3 flex-col transition-all duration-300 ease-out overflow-hidden')
        }
      >
        {isDesktopOpen ? (
          renderNavContent(false)
        ) : (
          <>
            <div className='flex items-center justify-center w-full mb-4'>
              <button
                type='button'
                className='h-10 w-10 flex items-center justify-center overflow-visible'
                onClick={openDesktopMenu}
                aria-label='Open desktop sidebar'
                title='Open sidebar'
              >
                <Image
                  src={
                    darkMode
                      ? '/brand/planify-logo-outline.svg'
                      : '/brand/planify-logo-primary.svg'
                  }
                  alt='Open menu'
                  width={30}
                  height={30}
                />
              </button>
            </div>

            <div className='mb-4 flex justify-center'>
              <div
                className={
                  (darkMode
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-white text-emerald-700') +
                  ' h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold'
                }
                title={userDisplayName}
                aria-label={`Profile ${userDisplayName}`}
              >
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
                      <Link
                        href={href}
                        className={
                          (darkMode
                            ? isActive
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-100 hover:text-slate-300'
                            : isActive
                              ? 'bg-emerald-500 text-white'
                              : 'text-emerald-50 hover:text-white') +
                          ' h-10 w-10 mx-auto rounded-lg flex items-center justify-center transition-colors'
                        }
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={label}
                        title={label}
                      >
                        {Icon && <Icon fontSize='small' />}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {visibleSubMenus.length > 0 && (
                <>
                  <div
                    className={
                      (darkMode ? 'bg-slate-600' : 'bg-emerald-400') +
                      ' h-px my-3 mx-2'
                    }
                    aria-hidden='true'
                  />

                  <ul className='space-y-2'>
                    {visibleSubMenus.map(({ label, href }) => {
                      type SidebarLabel = keyof typeof sidebarIcons;
                      const Icon = sidebarIcons[label as SidebarLabel];
                      const isExternal =
                        typeof href === 'string' && href.startsWith('http');
                      const isActive = pathname === href;

                      return (
                        <li key={label}>
                          {isExternal ? (
                            <a
                              href={href}
                              target='_blank'
                              rel='noreferrer'
                              className={
                                (darkMode
                                  ? 'text-slate-100 hover:text-slate-300'
                                  : 'text-emerald-50 hover:text-white') +
                                ' h-10 w-10 mx-auto rounded-lg flex items-center justify-center transition-colors'
                              }
                              aria-label={label}
                              title={label}
                            >
                              {Icon && <Icon fontSize='small' />}
                            </a>
                          ) : (
                            <Link
                              href={href}
                              className={
                                (darkMode
                                  ? isActive
                                    ? 'bg-slate-700 text-white'
                                    : 'text-slate-100 hover:text-slate-300'
                                  : isActive
                                    ? 'bg-emerald-500 text-white'
                                    : 'text-emerald-50 hover:text-white') +
                                ' h-10 w-10 mx-auto rounded-lg flex items-center justify-center transition-colors'
                              }
                              aria-current={isActive ? 'page' : undefined}
                              aria-label={label}
                              title={label}
                            >
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
    </>
  );
}
