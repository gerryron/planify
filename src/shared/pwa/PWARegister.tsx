'use client';

import { useEffect, useState } from 'react';
import { requestReplayQueuedWrites } from '@/shared/pwa/writeQueueClient';

const IOS_HINT_DISMISSED_KEY = 'iosInstallHintDismissed';

function isIosSafari() {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent);
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS/.test(userAgent);
  return isIos && isSafari && !isOtherBrowser;
}

export default function PWARegister() {
  const [showIosHint, setShowIosHint] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    const dismissed = localStorage.getItem(IOS_HINT_DISMISSED_KEY) === 'true';

    if (isIosSafari() && !standalone && !dismissed) {
      requestAnimationFrame(() => {
        setShowIosHint(true);
      });
    }
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let hasReloaded = false;

    const onControllerChange = () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
    );

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Try replaying queued writes right after registration to support
        // browsers where Background Sync is unavailable.
        await requestReplayQueuedWrites();

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateReady(true);
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }

          worker.addEventListener('statechange', () => {
            if (
              worker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(registration.waiting ?? worker);
              setUpdateReady(true);
            }
          });
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    const onOnline = () => {
      void requestReplayQueuedWrites();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestReplayQueuedWrites();
      }
    };

    void registerServiceWorker();
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      );
    };
  }, []);

  const dismissIosHint = () => {
    localStorage.setItem(IOS_HINT_DISMISSED_KEY, 'true');
    setShowIosHint(false);
  };

  const applyUpdate = () => {
    if (!waitingWorker) {
      return;
    }

    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <>
      {showIosHint && (
        <div className='fixed bottom-4 left-4 right-4 z-70 md:hidden rounded-xl border border-emerald-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900'>
          <p className='text-sm text-slate-700 dark:text-slate-100'>
            Install app on iPhone: tap Share, then choose Add to Home Screen.
          </p>
          <button
            type='button'
            onClick={dismissIosHint}
            className='mt-2 inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white'
          >
            Mengerti
          </button>
        </div>
      )}

      {updateReady && (
        <div className='fixed bottom-4 right-4 z-70 max-w-sm rounded-xl border border-emerald-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900'>
          <p className='text-sm text-slate-700 dark:text-slate-100'>
            App update is available.
          </p>
          <button
            type='button'
            onClick={applyUpdate}
            className='mt-2 inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white'
          >
            Refresh Sekarang
          </button>
        </div>
      )}
    </>
  );
}
