'use client';
import { useLayoutEffect } from 'react';
import {
  getStoredDarkModePreference,
  resolveInitialDarkMode,
} from '@/shared/theme/themePreference';

export function ThemeProvider() {
  useLayoutEffect(() => {
    const applyThemeClass = (isDark: boolean) => {
      const method = isDark ? 'add' : 'remove';
      document.documentElement.classList[method]('dark');
    };

    applyThemeClass(resolveInitialDarkMode());

    if (getStoredDarkModePreference() !== null) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      applyThemeClass(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return null;
}
