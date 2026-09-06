import {
  getQueuedWriteCount,
  getFailedWriteHistory,
  clearFailedWriteHistory,
  requestReplayQueuedWrites,
} from './writeQueueClient';

// ---------------------------------------------------------------------------
// Minimal in-memory IndexedDB fake, enough for the store APIs used by
// writeQueueClient (open, createObjectStore, transaction, count, getAll,
// clear). Databases are stateful per name so repeated open() calls see the
// same stores. Events fire on a microtask so handler pairs attached right
// after open()/objectStore() are registered before dispatch.
// ---------------------------------------------------------------------------
const DB_NAME = 'planify-sync-db';

class FakeRequest {
  result: unknown = null;
  error: unknown = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onupgradeneeded: (() => void) | null = null;
}

class FakeTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  private completed = false;

  constructor(
    private readonly db: FakeDB,
    readonly storeNames: string[],
  ) {}

  objectStore(name: string): FakeStore {
    const store = this.db.stores.get(name);
    if (!store) throw new Error(`store "${name}" not found`);
    store.currentTx = this;
    return store;
  }

  /** Like real IndexedDB: completes after the last request succeeds. */
  markRequestDone(): void {
    if (this.completed) return;
    this.completed = true;
    queueMicrotask(() => this.oncomplete?.());
  }
}

class FakeStore {
  records = new Map<number, unknown>();
  currentTx: FakeTransaction | null = null;

  count(): FakeRequest {
    const request = new FakeRequest();
    request.result = this.records.size;
    return this.dispatch(request, () => {});
  }

  getAll(): FakeRequest {
    const request = new FakeRequest();
    request.result = [...this.records.values()];
    return this.dispatch(request, () => {});
  }

  clear(): FakeRequest {
    const request = new FakeRequest();
    return this.dispatch(request, () => this.records.clear());
  }

  private dispatch(request: FakeRequest, mutate: () => void): FakeRequest {
    queueMicrotask(() => {
      mutate();
      request.onsuccess?.();
      this.currentTx?.markRequestDone();
    });
    return request;
  }
}

class FakeDB {
  stores = new Map<string, FakeStore>();
  objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  createObjectStore(name: string): FakeStore {
    const store = new FakeStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(names: string | string[]): FakeTransaction {
    const list = Array.isArray(names) ? names : [names];
    return new FakeTransaction(this, list);
  }

  close() {}
}

const fakeDatabases = new Map<string, FakeDB>();

const fakeIndexedDB = {
  open(name: string): FakeRequest {
    const request = new FakeRequest();
    let db = fakeDatabases.get(name);
    if (!db) {
      db = new FakeDB();
      fakeDatabases.set(name, db);
      request.result = db;
      // First open: run the upgrade handler (creates the stores) before success.
      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
    } else {
      request.result = db;
      queueMicrotask(() => request.onsuccess?.());
    }
    return request;
  },
};

function getStore(name: string): FakeStore {
  const db = fakeDatabases.get(DB_NAME);
  const store = db?.stores.get(name);
  if (!store) throw new Error(`store "${name}" not created`);
  return store;
}

/** Ensure the client has opened the DB (creating the stores), then seed rows. */
async function seedStore(name: string, rows: unknown[]): Promise<void> {
  await getQueuedWriteCount();
  const store = getStore(name);
  rows.forEach((row, index) => store.records.set(index + 1, row));
}

describe('writeQueueClient without a browser', () => {
  it('should return safe defaults', async () => {
    await expect(getQueuedWriteCount()).resolves.toBe(0);
    await expect(getFailedWriteHistory()).resolves.toEqual([]);
    await expect(clearFailedWriteHistory()).resolves.toBeUndefined();
    await expect(requestReplayQueuedWrites()).resolves.toBeUndefined();
  });
});

describe('writeQueueClient in a browser', () => {
  beforeEach(() => {
    fakeDatabases.clear();
    (globalThis as unknown as { window: unknown }).window = {
      indexedDB: fakeIndexedDB,
    };
    // The module references bare `indexedDB`, which resolves to the global.
    (globalThis as unknown as { indexedDB: unknown }).indexedDB = fakeIndexedDB;
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { indexedDB?: unknown }).indexedDB;
    delete (globalThis as unknown as { navigator?: unknown }).navigator;
  });

  it('should count queued writes', async () => {
    await seedStore('write-queue', [{ id: 1 }, { id: 2 }]);
    await expect(getQueuedWriteCount()).resolves.toBe(2);
  });

  it('should return failed write history sorted newest first and limited', async () => {
    await seedStore('failed-write-log', [
      {
        id: 1,
        url: '/a',
        method: 'POST',
        status: 400,
        statusText: 'Bad Request',
        lastAttemptAt: 100,
      },
      {
        id: 2,
        url: '/b',
        method: 'POST',
        status: 500,
        statusText: 'Server Error',
        lastAttemptAt: 300,
      },
      {
        id: 3,
        url: '/c',
        method: 'POST',
        status: 400,
        statusText: 'Bad Request',
        lastAttemptAt: 200,
      },
    ]);

    const rows = await getFailedWriteHistory(2);
    expect(rows.map((row) => row.id)).toEqual([2, 3]);
  });

  it('should clear failed write history', async () => {
    await seedStore('failed-write-log', [{ id: 1, lastAttemptAt: 1 }]);
    await clearFailedWriteHistory();
    expect(getStore('failed-write-log').records.size).toBe(0);
  });

  it('should send REPLAY_WRITE_QUEUE to the service worker controller and registration', async () => {
    const controllerPost = jest.fn();
    const activePost = jest.fn();
    (globalThis as unknown as { navigator: unknown }).navigator = {
      serviceWorker: {
        controller: { postMessage: controllerPost },
        getRegistration: jest.fn().mockResolvedValue({
          active: { postMessage: activePost },
          waiting: null,
          installing: null,
        }),
      },
    };

    await requestReplayQueuedWrites();

    expect(controllerPost).toHaveBeenCalledWith({
      type: 'REPLAY_WRITE_QUEUE',
    });
    expect(activePost).toHaveBeenCalledWith({ type: 'REPLAY_WRITE_QUEUE' });
  });

  it('should not crash when there is no service worker registration', async () => {
    const controllerPost = jest.fn();
    (globalThis as unknown as { navigator: unknown }).navigator = {
      serviceWorker: {
        controller: { postMessage: controllerPost },
        getRegistration: jest.fn().mockResolvedValue(null),
      },
    };

    await requestReplayQueuedWrites();
    expect(controllerPost).toHaveBeenCalledTimes(1);
  });

  it('should be a no-op when the service worker is unavailable', async () => {
    (globalThis as unknown as { navigator: unknown }).navigator = {};

    await expect(requestReplayQueuedWrites()).resolves.toBeUndefined();
  });
});
