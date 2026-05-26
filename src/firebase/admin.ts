import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
  const localServiceAccountPath = join(process.cwd(), "service-account-key.json");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  if (existsSync(localServiceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(localServiceAccountPath, "utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
      return initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
        projectId: serviceAccount.project_id,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  }

  // On Firebase Hosting/Functions, application default credentials are cheaper
  // to operate and safer than shipping service account JSON files.
  return initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function normalizePrivateKey(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unquoted
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}

export const adminApp = getAdminApp;
export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
export const adminStorage = () => getStorage(getAdminApp());
