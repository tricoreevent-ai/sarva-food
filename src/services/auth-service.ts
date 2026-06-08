"use client";

import {
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/firebase/client";
import { COLLECTIONS } from "@/firebase/collections";
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";
import type { UserDoc, UserRole } from "@/types/firebase";

const CUSTOMER_ROLES: UserRole[] = ["customer"];
const OPERATIONAL_ROLES: UserRole[] = [
  "owner",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "kitchen-manager",
  "accountant",
  "inventory-manager",
  "delivery-staff",
  "delivery",
];
const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];
type SessionSurface = "customer" | "owner" | "admin";
const GOOGLE_IDENTITY_SCRIPT_ID = "sarva-google-identity-services";
let googleIdentityScriptPromise: Promise<void> | null = null;

type GoogleOAuthTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleOAuthTokenResponse) => void;
            error_callback?: (error: unknown) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signInWithGoogle(role: UserRole = "customer") {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, provider).catch(async (error) => {
    if (!shouldTryConfiguredGoogleClient(error)) throw error;
    return signInWithConfiguredGoogleClient(auth);
  });
  if (role === "customer") {
    await ensureCustomerProfile(result.user, role);
  }
  await syncAuthSession(surfaceForAuthRole(role), { ensureCustomer: role === "customer" });
  return result.user;
}

export async function signInWithEmail(
  email: string,
  password: string,
  options: { allowedRoles?: UserRole[]; createCustomerIfMissing?: boolean } = {},
) {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(result.user.uid);
  const createCustomerIfMissing = options.createCustomerIfMissing ?? true;

  if (!profile && createCustomerIfMissing) {
    await ensureCustomerProfile(result.user, "customer");
  }

  const nextProfile = profile ?? (await getUserProfile(result.user.uid));
  if (!nextProfile?.active) {
    await signOut(auth);
    throw new Error("This account is inactive or has not been approved yet.");
  }

  if (options.allowedRoles?.length && !options.allowedRoles.includes(nextProfile.role)) {
    await signOut(auth);
    throw new Error("This sign-in screen is not available for your account type.");
  }

  await syncAuthSession(surfaceForAuthRole(nextProfile.role));
  return result.user;
}

export function signInCustomerWithEmail(email: string, password: string) {
  return signInWithEmail(email, password, {
    allowedRoles: CUSTOMER_ROLES,
    createCustomerIfMissing: true,
  });
}

export function signInOperationalWithEmail(email: string, password: string) {
  return signInWithEmail(email, password, {
    allowedRoles: OPERATIONAL_ROLES,
    createCustomerIfMissing: false,
  });
}

export function signInAdminWithEmail(email: string, password: string) {
  return signInWithEmail(email, password, {
    allowedRoles: ADMIN_ROLES,
    createCustomerIfMissing: false,
  });
}

export async function startEmailLinkLogin(email: string) {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/login?next=/`,
    handleCodeInApp: true,
  });
  window.localStorage.setItem("sarva-email-for-signin", email);
}

export async function completeEmailLinkLogin(role: UserRole = "customer") {
  const auth = getFirebaseAuth();
  if (!isSignInWithEmailLink(auth, window.location.href)) return null;
  const email = window.localStorage.getItem("sarva-email-for-signin");
  if (!email) return null;
  const result = await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem("sarva-email-for-signin");
  await ensureCustomerProfile(result.user, role);
  await syncAuthSession(surfaceForAuthRole(role));
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  role: UserRole = "customer",
  displayName?: string,
) {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName?.trim()) {
    await updateProfile(result.user, { displayName: displayName.trim() });
  }
  await ensureCustomerProfile(result.user, role);
  if (role === "customer") {
    await sendEmailVerification(result.user);
  }
  await syncAuthSession(surfaceForAuthRole(role));
  return result.user;
}

export function createPhoneVerifier(containerId: string) {
  return new RecaptchaVerifier(getFirebaseAuth(), containerId, { size: "invisible" });
}

export async function startPhoneLogin(phone: string, verifier: RecaptchaVerifier) {
  return signInWithPhoneNumber(getFirebaseAuth(), phone, verifier);
}

export async function confirmPhoneLogin(
  confirmation: ConfirmationResult,
  code: string,
  role: UserRole = "customer",
) {
  const result = await confirmation.confirm(code);
  await ensureCustomerProfile(result.user, role);
  await syncAuthSession(surfaceForAuthRole(role));
  return result.user;
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(getFirebaseAuth(), email);
}

export function signOutUser() {
  return signOut(getFirebaseAuth());
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserDoc | null) => void,
) {
  return onSnapshot(doc(getFirebaseDb(), COLLECTIONS.users, uid), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.data() as UserDoc) : null);
  });
}

export async function getCurrentIdToken() {
  const user = getFirebaseAuth().currentUser;
  return user ? user.getIdToken() : null;
}

export async function getUserProfile(uid: string) {
  const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.users, uid));
  return snapshot.exists() ? (snapshot.data() as UserDoc) : null;
}

export function isOperationalRole(role: UserRole) {
  return OPERATIONAL_ROLES.includes(role);
}

export function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.includes(role);
}

export async function syncAuthSession(surface: SessionSurface = "customer", options: { ensureCustomer?: boolean } = {}) {
  const idToken = await getCurrentIdToken();
  if (!idToken) return null;

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken, surface, ensureCustomer: options.ensureCustomer === true }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to establish your session.");
  }

  return response.json() as Promise<{
    ok: true;
    role: UserRole;
    tenantId?: string;
    branchIds?: string[];
  }>;
}

function surfaceForAuthRole(role: UserRole): SessionSurface {
  if (ADMIN_ROLES.includes(role)) return "admin";
  if (OPERATIONAL_ROLES.includes(role)) return "owner";
  return "customer";
}

export async function ensureCustomerProfile(user: User, role: UserRole = "customer") {
  if (role !== "customer") {
    throw new Error("Operational users must be created by an administrator.");
  }

  const db = getFirebaseDb();
  const userRef = doc(db, COLLECTIONS.users, user.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    await setDoc(
      userRef,
      omitUndefinedFields({
        displayName: user.displayName ?? existing.data().displayName ?? "Nammude user",
        email: user.email ?? existing.data().email,
        phone: user.phoneNumber ?? existing.data().phone,
        photoURL: user.photoURL ?? existing.data().photoURL,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
    await setDoc(
      doc(db, COLLECTIONS.customerProfiles, user.uid),
      omitUndefinedFields({
        id: user.uid,
        uid: user.uid,
        displayName: user.displayName ?? existing.data().displayName ?? "Nammude user",
        email: user.email ?? existing.data().email,
        phone: user.phoneNumber ?? existing.data().phone,
        photoURL: user.photoURL ?? existing.data().photoURL,
        emailVerified: user.emailVerified,
        phoneVerified: Boolean(user.phoneNumber),
        active: true,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
    return;
  }

  const profile: Omit<UserDoc, "createdAt" | "updatedAt"> = {
    id: user.uid,
    uid: user.uid,
    displayName: user.displayName ?? "Nammude user",
    email: user.email ?? undefined,
    phone: user.phoneNumber ?? undefined,
    photoURL: user.photoURL ?? undefined,
    role: "customer",
    roleId: "customer",
    tenantIds: [],
    restaurantIds: [],
    branchIds: [],
    permissions: ["customer:profile", "customer:orders"],
    active: true,
  };

  await setDoc(userRef, omitUndefinedFields({
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await setDoc(
    doc(db, COLLECTIONS.customerProfiles, user.uid),
    omitUndefinedFields({
      id: user.uid,
      uid: user.uid,
      displayName: user.displayName ?? "Nammude user",
      email: user.email ?? undefined,
      phone: user.phoneNumber ?? undefined,
      photoURL: user.photoURL ?? undefined,
      emailVerified: user.emailVerified,
      phoneVerified: Boolean(user.phoneNumber),
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
}

function omitUndefinedFields<T extends object>(input: T) {
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(([, value]) => typeof value !== "undefined"),
  ) as Partial<T>;
}

export const DEV_AUTH_FIXTURE = {
  tenantId: DEFAULT_TENANT_ID,
  branchId: DEFAULT_BRANCH_ID,
  operationalRoles: OPERATIONAL_ROLES,
  adminRoles: ADMIN_ROLES,
};

function configuredGoogleClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim();
}

function shouldTryConfiguredGoogleClient(error: unknown) {
  if (!configuredGoogleClientId()) return false;
  const message = error instanceof Error ? error.message : String(error);
  return !/popup-closed-by-user|cancelled|cancelled-popup-request/i.test(message);
}

async function signInWithConfiguredGoogleClient(auth: ReturnType<typeof getFirebaseAuth>) {
  const clientId = configuredGoogleClientId();
  if (!clientId) throw new Error("Google OAuth client id is not configured.");

  await loadGoogleIdentityServices();
  const tokenResponse = await requestGoogleAccessToken(clientId);
  if (!tokenResponse.access_token) {
    throw new Error(tokenResponse.error_description || tokenResponse.error || "Google sign-in did not return an access token.");
  }

  return signInWithCredential(auth, GoogleAuthProvider.credential(null, tokenResponse.access_token));
}

function loadGoogleIdentityServices() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google sign-in is available only in the browser."));
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  googleIdentityScriptPromise ??= new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Google sign-in.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

function requestGoogleAccessToken(clientId: string) {
  return new Promise<GoogleOAuthTokenResponse>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(response);
      },
      error_callback: reject,
    });

    if (!tokenClient) {
      reject(new Error("Google sign-in is not ready."));
      return;
    }

    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
}
