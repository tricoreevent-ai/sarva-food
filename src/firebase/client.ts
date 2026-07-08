import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import {
  connectAuthEmulator,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";
import { firebaseConfig, isFirebaseConfigured } from "@/firebase/config";
import { shouldUseEmulators } from "@/lib/env";
export { firebaseConfig, isFirebaseConfigured } from "@/firebase/config";

let emulatorConnected = false;
let authPersistenceConfigured = false;
let analyticsPromise: Promise<Analytics | null> | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase client config is missing. Check .env.local.");
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  
  return app;
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  configureAuthPersistence(auth);
  if (shouldUseEmulators()) {
    connectEmulatorsOnce(auth, getFirestore(getFirebaseApp()), getStorage(getFirebaseApp()));
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  const db = getFirestoreInstance();
  if (shouldUseEmulators()) {
    connectEmulatorsOnce(getAuth(getFirebaseApp()), db, getStorage(getFirebaseApp()));
  }
  return db;
}

export function getFirebaseAnalytics() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  analyticsPromise ??= deferClientTask(() =>
    isSupported()
      .then((supported) => (supported ? getAnalytics(getFirebaseApp()) : null))
      .catch(() => null),
  );

  return analyticsPromise;
}

function deferClientTask<T>(task: () => Promise<T>) {
  return new Promise<T | null>((resolve) => {
    const run = () => void task().then(resolve).catch(() => resolve(null));
    const win = window as Window & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number };
    if (typeof win.requestIdleCallback === "function") {
      win.requestIdleCallback(run, { timeout: 2500 });
      return;
    }
    if (document.readyState === "complete") {
      queueMicrotask(run);
      return;
    }
    window.addEventListener("load", () => queueMicrotask(run), { once: true });
  });
}

function configureAuthPersistence(auth: Auth) {
  if (authPersistenceConfigured || typeof window === "undefined") return;
  void setPersistence(auth, browserLocalPersistence);
  authPersistenceConfigured = true;
}

function getFirestoreInstance() {
  if (firestoreInstance) return firestoreInstance;

  const app = getFirebaseApp();
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache:
        typeof window === "undefined"
          ? memoryLocalCache()
          : persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }

  return firestoreInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  const storage = getStorage(getFirebaseApp());
  if (shouldUseEmulators()) {
    connectEmulatorsOnce(getAuth(getFirebaseApp()), getFirestore(getFirebaseApp()), storage);
  }
  return storage;
}

export const app: FirebaseApp | null = null;
export const firebaseApp = app;
export const auth: Auth | null = null;
export const db: Firestore | null = null;
export const firestore = db;
export const storage: FirebaseStorage | null = null;
export const analytics: Promise<Analytics | null> = Promise.resolve(null);

function connectEmulatorsOnce(auth: Auth, db: Firestore, storage: FirebaseStorage) {
  if (
    emulatorConnected ||
    typeof window === "undefined" ||
    !shouldUseEmulators()
  ) {
    return;
  }

  // Local-only emulator wiring keeps dev costs at zero and avoids accidental
  // production writes while services are being integrated incrementally.
  const host = window.location.hostname;
  
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  emulatorConnected = true;
}
