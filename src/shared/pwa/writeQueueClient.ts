const WRITE_SYNC_DB = 'planify-sync-db';
const WRITE_SYNC_STORE = 'write-queue';
const FAILED_SYNC_STORE = 'failed-write-log';

export type FailedWriteHistoryItem = {
  id: number;
  url: string;
  method: string;
  status: number;
  statusText: string;
  lastAttemptAt: number;
};

function openWriteSyncDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(WRITE_SYNC_DB, 2);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WRITE_SYNC_STORE)) {
        db.createObjectStore(WRITE_SYNC_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains(FAILED_SYNC_STORE)) {
        db.createObjectStore(FAILED_SYNC_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedWriteCount(): Promise<number> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return 0;
  }

  const db = await openWriteSyncDb();
  const tx = db.transaction(WRITE_SYNC_STORE, 'readonly');
  const store = tx.objectStore(WRITE_SYNC_STORE);
  const countRequest = store.count();

  const count = await new Promise<number>((resolve, reject) => {
    countRequest.onsuccess = () => resolve(countRequest.result ?? 0);
    countRequest.onerror = () => reject(countRequest.error);
  });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  db.close();
  return count;
}

export async function requestReplayQueuedWrites(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const sendReplayMessage = (worker: ServiceWorker | null) => {
    if (!worker) return;
    worker.postMessage({ type: 'REPLAY_WRITE_QUEUE' });
  };

  sendReplayMessage(navigator.serviceWorker.controller);

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return;
  }

  sendReplayMessage(registration.active ?? null);
  sendReplayMessage(registration.waiting ?? null);
  sendReplayMessage(registration.installing ?? null);
}

export async function getFailedWriteHistory(
  limit = 10,
): Promise<FailedWriteHistoryItem[]> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return [];
  }

  const db = await openWriteSyncDb();
  const tx = db.transaction(FAILED_SYNC_STORE, 'readonly');
  const store = tx.objectStore(FAILED_SYNC_STORE);
  const request = store.getAll();

  const rows = await new Promise<FailedWriteHistoryItem[]>(
    (resolve, reject) => {
      request.onsuccess = () =>
        resolve((request.result ?? []) as FailedWriteHistoryItem[]);
      request.onerror = () => reject(request.error);
    },
  );

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  db.close();

  return rows.sort((a, b) => b.lastAttemptAt - a.lastAttemptAt).slice(0, limit);
}

export async function clearFailedWriteHistory(): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }

  const db = await openWriteSyncDb();
  const tx = db.transaction(FAILED_SYNC_STORE, 'readwrite');
  tx.objectStore(FAILED_SYNC_STORE).clear();

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  db.close();
}
