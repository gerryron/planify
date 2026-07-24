'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getQueuedWriteCount } from '@/shared/pwa/writeQueueClient';
import { authService, type SessionUser } from '@/features/auth/services/authService';
import SidebarMobile from './SidebarMobile';
import SidebarDesktop from './SidebarDesktop';
import type { SidebarData } from './SidebarNavContent';

export default function Sidebar() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const themeAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const THEME_SWITCH_ANIMATION_MS_DESKTOP = 460;
  const THEME_SWITCH_ANIMATION_MS_MOBILE = 760;

  const mainMenus = [
    { label: 'Home', href: '/home' },
    { label: 'Monthly Budget', href: '/monthly-budget' },
    { label: 'Cash Log', href: '/cash-log' },
  ] as const;

  const adminOnlyMenus = [{ label: 'Admin Panel', href: '/admin-panel' }] as const;
  const isDevelopment = process.env.NODE_ENV === 'development';

  const subMenusBase = [
    { label: 'Wallets', href: '/wallets' },
    { label: 'Categories', href: '/categories' },
    { label: 'Settings', href: '/settings' },
  ] as const;

  const subMenus = [
    ...subMenusBase,
    ...(isDevelopment ? [{ label: 'Swagger', href: 'http://localhost:3010', external: true }] : []),
  ] as const;

  const isSuperadmin = sessionUser?.role === 'superadmin';
  const visibleMainMenus = isSuperadmin ? adminOnlyMenus : mainMenus;
  const visibleSubMenus = isSuperadmin ? [] : subMenus;
  const userDisplayName = sessionUser?.name?.trim() || 'User';
  const userInitials = userDisplayName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U';

  // ─── Theme sync ───
  const syncThemeClass = (isDark: boolean) => {
    const method = isDark ? 'add' : 'remove';
    document.documentElement.classList[method]('dark');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      setMounted(true);
      const isDark = localStorage.getItem('darkMode') === 'true';
      const desktopOpen = localStorage.getItem('desktopSidebarOpen');
      syncThemeClass(isDark);
      setDarkMode(isDark);
      if (desktopOpen !== null) setIsDesktopOpen(desktopOpen === 'true');
    });
  }, []);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      try { const data = await authService.me(); if (active) setSessionUser(data.user); }
      catch { if (active) setSessionUser(null); }
    };
    void loadUser();
    return () => { active = false; };
  }, []);

  useEffect(() => { if (mounted) syncThemeClass(darkMode); localStorage.setItem('darkMode', darkMode.toString()); }, [darkMode, mounted]);
  useEffect(() => { if (mounted) localStorage.setItem('desktopSidebarOpen', isDesktopOpen.toString()); }, [isDesktopOpen, mounted]);

  useEffect(() => {
    return () => { if (themeAnimationTimerRef.current) clearTimeout(themeAnimationTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;
    const refresh = async () => {
      try { const count = await getQueuedWriteCount(); if (active) setQueueCount(count); }
      catch { if (active) setQueueCount(0); }
    };
    void refresh();
    const onOnline = () => { void refresh(); };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  // ─── Handlers ───
  const toggleTheme = () => {
    if (isThemeAnimating) return;
    const animationMs = typeof window !== 'undefined' && window.innerWidth < 768
      ? THEME_SWITCH_ANIMATION_MS_MOBILE : THEME_SWITCH_ANIMATION_MS_DESKTOP;
    setIsThemeAnimating(true);
    setDarkMode((v) => !v);
    if (themeAnimationTimerRef.current) clearTimeout(themeAnimationTimerRef.current);
    themeAnimationTimerRef.current = setTimeout(() => { setIsThemeAnimating(false); themeAnimationTimerRef.current = null; }, animationMs);
  };

  const handleLogout = async () => { await authService.logout(); router.replace('/login'); };

  if (!mounted) return null;

  // ─── Build sidebar data ───
  const sidebarData: SidebarData = {
    darkMode,
    isMobile: true,
    isThemeAnimating,
    userDisplayName,
    userInitials,
    isSuperadmin,
    visibleMainMenus,
    visibleSubMenus,
    isOptionsOpen,
    toggleTheme,
    toggleOptions: () => setIsOptionsOpen((v) => !v),
    closeMobileMenu: () => setIsMobileOpen(false),
    closeDesktopMenu: () => setIsDesktopOpen(false),
    handleLogout,
  };

  const desktopData: SidebarData = { ...sidebarData, isMobile: false };

  return (
    <>
      <SidebarMobile
        data={sidebarData}
        isMobileOpen={isMobileOpen}
        queueCount={queueCount}
        openMobile={() => setIsMobileOpen(true)}
        closeMobile={() => setIsMobileOpen(false)}
      />
      <SidebarDesktop
        data={desktopData}
        isDesktopOpen={isDesktopOpen}
        openDesktop={() => setIsDesktopOpen(true)}
      />
    </>
  );
}
