type CachePayload<T> = {
  total: number;
  items: T[];
  savedAt: number;
};

const DB_NAME = 'gaasd-cache';
const DB_VERSION = 1;
const STORE_FNS = 'library_functions';
const STORE_MODS = 'library_modules';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FNS)) db.createObjectStore(STORE_FNS);
      if (!db.objectStoreNames.contains(STORE_MODS)) db.createObjectStore(STORE_MODS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('indexedDB_open_failed'));
  });

const getStore = async (storeName: string, mode: IDBTransactionMode) => {
  const db = await openDb();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { db, tx, store };
};

const getValue = <T,>(store: IDBObjectStore, key: string) =>
  new Promise<T | null>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error || new Error('indexedDB_get_failed'));
  });

const putValue = (store: IDBObjectStore, key: string, value: unknown) =>
  new Promise<void>((resolve, reject) => {
    const req = store.put(value as any, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('indexedDB_put_failed'));
  });

const waitTx = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('indexedDB_tx_failed'));
    tx.onabort = () => reject(tx.error || new Error('indexedDB_tx_aborted'));
  });

export const libraryCache = {
  async getFunctions<T>(scope: string): Promise<CachePayload<T> | null> {
    const { db, tx, store } = await getStore(STORE_FNS, 'readonly');
    try {
      const v = await getValue<CachePayload<T>>(store, scope);
      await waitTx(tx);
      return v;
    } finally {
      db.close();
    }
  },
  async setFunctions<T>(scope: string, payload: CachePayload<T>): Promise<void> {
    const { db, tx, store } = await getStore(STORE_FNS, 'readwrite');
    try {
      await putValue(store, scope, payload);
      await waitTx(tx);
    } finally {
      db.close();
    }
  },

  async getModules<T>(scope: string): Promise<CachePayload<T> | null> {
    const { db, tx, store } = await getStore(STORE_MODS, 'readonly');
    try {
      const v = await getValue<CachePayload<T>>(store, scope);
      await waitTx(tx);
      return v;
    } finally {
      db.close();
    }
  },
  async setModules<T>(scope: string, payload: CachePayload<T>): Promise<void> {
    const { db, tx, store } = await getStore(STORE_MODS, 'readwrite');
    try {
      await putValue(store, scope, payload);
      await waitTx(tx);
    } finally {
      db.close();
    }
  }
};

