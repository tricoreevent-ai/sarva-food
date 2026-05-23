const DB_NAME = "sarva-offline";
const DB_VERSION = 2;
const STORE_LIMITS: Record<OfflineStoreName, number> = {
  queue: 250,
  reports: 40,
  metadata: 80,
};

export type OfflineStoreName = "queue" | "reports" | "metadata";

export type OfflineReportCache<T = unknown> = {
  id: string;
  value: T;
  cachedAt: string;
  expiresAt?: string;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function isBrowser() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openOfflineDb() {
  if (!isBrowser()) return Promise.resolve(null);
  dbPromise ??= new Promise<IDBDatabase | null>((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("queue")) {
        const queue = db.createObjectStore("queue", { keyPath: "id" });
        queue.createIndex("status", "status", { unique: false });
        queue.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("reports")) {
        const reports = db.createObjectStore("reports", { keyPath: "id" });
        reports.createIndex("cachedAt", "cachedAt", { unique: false });
        reports.createIndex("expiresAt", "expiresAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return dbPromise;
}

function fallbackKey(storeName: OfflineStoreName) {
  return `sarva-offline:${storeName}`;
}

function readFallback<T extends { id: string }>(storeName: OfflineStoreName): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(fallbackKey(storeName)) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function writeFallback<T extends { id: string }>(storeName: OfflineStoreName, rows: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(fallbackKey(storeName), JSON.stringify(rows));
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putOfflineRecord<T extends { id: string }>(
  storeName: OfflineStoreName,
  value: T,
) {
  const db = await openOfflineDb();
  if (!db) {
    const rows = readFallback<T>(storeName).filter((item) => item.id !== value.id);
    writeFallback(storeName, [value, ...rows]);
    return value;
  }

  try {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    await requestToPromise(transaction.objectStore(storeName).get(value.id)).catch(() => value);
    await trimOfflineStore(storeName, STORE_LIMITS[storeName]).catch(() => undefined);
    return value;
  } catch (error) {
    if (!isIndexedDbRecoverableError(error)) throw error;
    resetOfflineDb();
    const rows = readFallback<T>(storeName).filter((item) => item.id !== value.id);
    writeFallback(storeName, [value, ...rows]);
    return value;
  }
}

export async function getOfflineRecord<T extends { id: string }>(
  storeName: OfflineStoreName,
  id: string,
) {
  const db = await openOfflineDb();
  if (!db) return readFallback<T>(storeName).find((item) => item.id === id) ?? null;

  try {
    const transaction = db.transaction(storeName, "readonly");
    return requestToPromise<T | undefined>(transaction.objectStore(storeName).get(id)).then((value) => value ?? null);
  } catch (error) {
    if (!isIndexedDbRecoverableError(error)) throw error;
    resetOfflineDb();
    return readFallback<T>(storeName).find((item) => item.id === id) ?? null;
  }
}

export async function getAllOfflineRecords<T extends { id: string }>(
  storeName: OfflineStoreName,
) {
  const db = await openOfflineDb();
  if (!db) return cleanupExpiredFallback(readFallback<T>(storeName), storeName);

  try {
    const transaction = db.transaction(storeName, "readonly");
    return requestToPromise<T[]>(transaction.objectStore(storeName).getAll())
      .then((rows) => cleanupExpiredRows(rows, storeName));
  } catch (error) {
    if (!isIndexedDbRecoverableError(error)) throw error;
    resetOfflineDb();
    return cleanupExpiredFallback(readFallback<T>(storeName), storeName);
  }
}

export async function deleteOfflineRecord(storeName: OfflineStoreName, id: string) {
  const db = await openOfflineDb();
  if (!db) {
    writeFallback(storeName, readFallback(storeName).filter((item) => item.id !== id));
    return;
  }

  try {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch (error) {
    if (!isIndexedDbRecoverableError(error)) throw error;
    resetOfflineDb();
    writeFallback(storeName, readFallback(storeName).filter((item) => item.id !== id));
  }
}

export async function cacheReport<T>(id: string, value: T, ttlMs?: number) {
  const now = Date.now();
  return putOfflineRecord<OfflineReportCache<T>>("reports", {
    id,
    value,
    cachedAt: new Date(now).toISOString(),
    expiresAt: ttlMs ? new Date(now + ttlMs).toISOString() : undefined,
  });
}

export async function getCachedReport<T>(id: string) {
  const record = await getOfflineRecord<OfflineReportCache<T>>("reports", id);
  if (!record) return null;
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    await deleteOfflineRecord("reports", id);
    return null;
  }
  return record;
}

export async function cleanupStaleOfflineCache() {
  await Promise.all(
    (["queue", "reports", "metadata"] as OfflineStoreName[]).map((storeName) =>
      trimOfflineStore(storeName, STORE_LIMITS[storeName]),
    ),
  );
}

async function trimOfflineStore(storeName: OfflineStoreName, limit: number) {
  const db = await openOfflineDb();
  if (!db) {
    const rows = cleanupExpiredRows(readFallback(storeName), storeName);
    writeFallback(storeName, rows.slice(-limit));
    return;
  }

  try {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const rows = await requestToPromise<Array<{ id: string; createdAt?: string; cachedAt?: string; expiresAt?: string }>>(store.getAll());
    const now = Date.now();
    const sorted = rows
      .filter((row) => !row.expiresAt || new Date(row.expiresAt).getTime() > now)
      .sort((first, second) => comparableTime(second) - comparableTime(first));
    const keepIds = new Set(sorted.slice(0, limit).map((row) => row.id));
    rows
      .filter((row) => !keepIds.has(row.id))
      .forEach((row) => store.delete(row.id));
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch (error) {
    if (!isIndexedDbRecoverableError(error)) throw error;
    resetOfflineDb();
    const rows = cleanupExpiredRows(readFallback(storeName), storeName);
    writeFallback(storeName, rows.slice(0, limit));
  }
}

function cleanupExpiredFallback<T extends { id: string }>(rows: T[], storeName: OfflineStoreName) {
  const cleaned = cleanupExpiredRows(rows, storeName);
  if (cleaned.length !== rows.length) writeFallback(storeName, cleaned);
  return cleaned;
}

function cleanupExpiredRows<T>(rows: T[], storeName: OfflineStoreName): T[] {
  if (storeName !== "reports") return rows;
  const now = Date.now();
  return rows.filter((row) => {
    const expiresAt = (row as { expiresAt?: string }).expiresAt;
    return !expiresAt || new Date(expiresAt).getTime() > now;
  });
}

function comparableTime(row: { createdAt?: string; cachedAt?: string }) {
  return new Date(row.createdAt ?? row.cachedAt ?? 0).getTime();
}

function resetOfflineDb() {
  dbPromise = null;
}

function isIndexedDbRecoverableError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    [
      "InvalidStateError",
      "TransactionInactiveError",
      "AbortError",
      "NotFoundError",
      "UnknownError",
    ].includes(name) ||
    /database connection is closing|transaction.*inactive|not found|indexeddb/i.test(message)
  );
}
