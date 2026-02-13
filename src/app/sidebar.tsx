'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightlightIcon from '@mui/icons-material/Nightlight';
import { sidebarIcons } from './sidebarIcons';

export default function Sidebar() {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

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
      syncThemeClass(isDark);
      setDarkMode(isDark);
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    syncThemeClass(darkMode);
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode, mounted]);
  if (!mounted) return null;
  return (
    <aside
      className={
        (darkMode
          ? 'w-64 bg-slate-800 shadow-lg flex flex-col p-6'
          : 'w-64 bg-amber-100 shadow-lg flex flex-col p-6') +
        ' h-screen sticky top-0 left-0'
      }
    >
      <div className='flex items-center justify-between mb-8'>
        <h2
          className={
            darkMode
              ? 'text-xl font-bold text-slate-100'
              : 'text-xl font-bold text-stone-900'
          }
        >
          Planify
        </h2>
        <button
          className={
            darkMode
              ? 'bg-slate-800 text-slate-100 px-3 py-1 rounded'
              : 'bg-amber-100 text-stone-900 px-3 py-1 rounded'
          }
          onClick={() => setDarkMode((v) => !v)}
          aria-label='Toggle dark mode'
        >
          {darkMode ? (
            <NightlightIcon fontSize='small' />
          ) : (
            <WbSunnyIcon fontSize='small' />
          )}
        </button>
      </div>
      <nav className='flex-1'>
        <ul className='space-y-4'>
          {(
            [
              { label: 'Home', href: '/' },
              { label: 'Monthly Budget', href: '/monthly-budget' },
              { label: 'Daily Tracker', href: '/daily-tracker' },
            ] as const
          ).map(({ label, href }) => {
            type SidebarLabel = keyof typeof sidebarIcons;
            const Icon = sidebarIcons[label as SidebarLabel];
            return (
              <li key={label}>
                <Link
                  href={href}
                  className={
                    (darkMode
                      ? 'text-slate-100 hover:text-slate-300'
                      : 'text-stone-900 hover:text-stone-600') +
                    ' font-medium flex items-center gap-2'
                  }
                >
                  {Icon && <Icon fontSize='small' className='-ml-1' />}
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <span
              className={
                darkMode
                  ? 'text-slate-500 font-medium'
                  : 'text-stone-400 font-medium'
              }
            >
              Upcoming Feature
            </span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
