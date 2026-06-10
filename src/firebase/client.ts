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
import { shouldUseEmulators } from "@/lib/env";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.appId,
);

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
  connectEmulatorsOnce(auth, getFirestore(getFirebaseApp()), getStorage(getFirebaseApp()));
  return auth;
}

export function getFirebaseDb(): Firestore {
  const db = getFirestoreInstance();
  connectEmulatorsOnce(getAuth(getFirebaseApp()), db, getStorage(getFirebaseApp()));
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
  connectEmulatorsOnce(getAuth(getFirebaseApp()), getFirestore(getFirebaseApp()), storage);
  return storage;
}

function safeResolve<T>(factory: () => T): T | null {
  if (!isFirebaseConfigured) return null;
  try {
    return factory();
  } catch {
    return null;
  }
}

export const app = safeResolve(getFirebaseApp);
export const firebaseApp = app;
export const auth = safeResolve(getFirebaseAuth);
export const db = safeResolve(getFirebaseDb);
export const firestore = db;
export const storage = safeResolve(getFirebaseStorage);
export const analytics = getFirebaseAnalytics();

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
