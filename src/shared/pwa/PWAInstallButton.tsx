'use client';

import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PWAInstallButtonProps = {
  darkMode: boolean;
  compact?: boolean;
};

export default function PWAInstallButton({
  darkMode,
  compact = false,
}: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (standalone) {
      setIsInstalled(true);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const canShow = useMemo(
    () => !isInstalled && deferredPrompt !== null,
    [deferredPrompt, isInstalled],
  );

  const handleInstall = async () => {
    if (!deferredPrompt || isInstalling) {
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!canShow) {
    return null;
  }

  if (compact) {
    return (
      <button
        type='button'
        onClick={handleInstall}
        disabled={isInstalling}
        className={
          (darkMode
            ? 'text-slate-100 bg-slate-700'
            : 'text-white bg-emerald-500') +
          ' h-11 rounded-lg px-3 inline-flex items-center justify-center gap-2 disabled:opacity-70'
        }
        aria-label='Install app'
      >
        <DownloadForOfflineIcon fontSize='small' />
        <span className='text-sm font-semibold'>Install</span>
      </button>
    );
  }

  return (
    <button
      type='button'
      onClick={handleInstall}
      disabled={isInstalling}
      className={
        (darkMode
          ? 'bg-slate-700 text-slate-100 border-slate-600'
          : 'bg-emerald-500 text-white border-emerald-400') +
        ' h-11 w-full rounded-full border px-4 flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-70'
      }
      aria-label='Install app'
    >
      <DownloadForOfflineIcon fontSize='small' />
      <span>Install App</span>
    </button>
  );
}
