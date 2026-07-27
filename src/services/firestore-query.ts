import {
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  startAfter,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { readThroughCache } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/constants";

type SharedListener<T> = {
  subscribers: Set<(value: T) => void>;
  unsubscribe: Unsubscribe;
  lastValue?: T;
};

const listeners = new Map<string, SharedListener<unknown>>();
const blockedListeners = new Map<string, number>();
const LISTENER_BLOCK_MS = 60_000;

export type PageResult<T> = {
  items: T[];
  cursor?: DocumentSnapshot<T>;
  hasMore: boolean;
};

export async function getCachedDoc<T extends DocumentData>(
  key: string,
  ref: DocumentReference<T>,
  ttlMs: number = CACHE_TTL.short,
) {
  return readThroughCache(`${key}:${ref.path}`, ttlMs, async () => {
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  });
}

export async function getCachedQuery<T extends DocumentData>(
  key: string,
  q: Query<T>,
  ttlMs: number = CACHE_TTL.short,
  options?: { persist?: boolean },
) {
  return readThroughCache(key, ttlMs, async () => {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((entry) => entry.data());
  }, options);
}

export async function getPage<T extends DocumentData>(
  collectionRef: CollectionReference<T>,
  constraints: QueryConstraint[],
  pageSize: number,
  cursor?: DocumentSnapshot<T>,
): Promise<PageResult<T>> {
  const pageQuery = cursor
    ? query(collectionRef, ...constraints, startAfter(cursor), limit(pageSize + 1))
    : query(collectionRef, ...constraints, limit(pageSize + 1));
  const snapshot = await getDocs(pageQuery);
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    items: docs.map((entry) => entry.data()),
    cursor: docs.at(-1),
    hasMore: snapshot.docs.length > pageSize,
  };
}

export function listenShared<T>(
  key: string,
  start: (emit: (value: T) => void) => Unsubscribe,
  callback: (value: T) => void,
) {
  const blockedUntil = blockedListeners.get(key) ?? 0;
  if (blockedUntil > Date.now()) return () => undefined;
  const existing = listeners.get(key) as SharedListener<T> | undefined;
  if (existing) {
    existing.subscribers.add(callback);
    if (existing.lastValue !== undefined) callback(existing.lastValue);
    return () => releaseSharedListener(key, callback);
  }

  const subscribers = new Set<(value: T) => void>([callback]);
  const unsubscribe = start((value) => {
    const entry = listeners.get(key) as SharedListener<T> | undefined;
    if (!entry) return;
    entry.lastValue = value;
    entry.subscribers.forEach((subscriber) => subscriber(value));
  });
  listeners.set(key, { subscribers, unsubscribe } as unknown as SharedListener<unknown>);

  return () => releaseSharedListener(key, callback);
}

function releaseSharedListener<T>(key: string, callback: (value: T) => void) {
  const entry = listeners.get(key) as SharedListener<T> | undefined;
  if (!entry) return;
  entry.subscribers.delete(callback);
  if (entry.subscribers.size === 0) {
    entry.unsubscribe();
    listeners.delete(key);
  }
}

export function listenToQueryShared<T extends DocumentData>(
  key: string,
  q: Query<T>,
  callback: (items: T[]) => void,
) {
  return listenShared<T[]>(
    key,
    (emit) =>
      onSnapshot(q, (snapshot) => {
        emit(snapshot.docs.map((entry) => entry.data()));
      }, (error) => {
        if (error.code === "permission-denied") {
          blockedListeners.set(key, Date.now() + LISTENER_BLOCK_MS);
          releaseAllSharedListeners(key);
          return;
        }
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Food Gedi] Firestore listener stopped.", error.message);
        }
        emit([]);
      }),
    callback,
  );
}

function releaseAllSharedListeners(key: string) {
  const entry = listeners.get(key);
  if (!entry) return;
  entry.unsubscribe();
  listeners.delete(key);
}
