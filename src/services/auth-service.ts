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
const ADMIN_ROLES: UserRole[] = ["admin"];

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signInWithGoogle(role: UserRole = "customer") {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  await ensureCustomerProfile(result.user, role);
  await syncAuthSession();
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

  await syncAuthSession();
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
  await syncAuthSession();
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
  await syncAuthSession();
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
  await syncAuthSession();
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

export async function syncAuthSession() {
  const idToken = await getCurrentIdToken();
  if (!idToken) return null;

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error("Unable to establish your session.");
  }

  return response.json() as Promise<{
    ok: true;
    role: UserRole;
    tenantId?: string;
    branchIds?: string[];
  }>;
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
      {
        displayName: user.displayName ?? existing.data().displayName ?? "Sarva user",
        email: user.email ?? existing.data().email,
        phone: user.phoneNumber ?? existing.data().phone,
        photoURL: user.photoURL ?? existing.data().photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await setDoc(
      doc(db, COLLECTIONS.customerProfiles, user.uid),
      {
        id: user.uid,
        uid: user.uid,
        displayName: user.displayName ?? existing.data().displayName ?? "Sarva user",
        email: user.email ?? existing.data().email,
        phone: user.phoneNumber ?? existing.data().phone,
        photoURL: user.photoURL ?? existing.data().photoURL,
        emailVerified: user.emailVerified,
        phoneVerified: Boolean(user.phoneNumber),
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  const profile: Omit<UserDoc, "createdAt" | "updatedAt"> = {
    id: user.uid,
    uid: user.uid,
    displayName: user.displayName ?? "Sarva user",
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

  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, COLLECTIONS.customerProfiles, user.uid),
    {
      id: user.uid,
      uid: user.uid,
      displayName: user.displayName ?? "Sarva user",
      email: user.email ?? undefined,
      phone: user.phoneNumber ?? undefined,
      photoURL: user.photoURL ?? undefined,
      emailVerified: user.emailVerified,
      phoneVerified: Boolean(user.phoneNumber),
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export const DEV_AUTH_FIXTURE = {
  tenantId: DEFAULT_TENANT_ID,
  branchId: DEFAULT_BRANCH_ID,
  operationalRoles: OPERATIONAL_ROLES,
  adminRoles: ADMIN_ROLES,
};
