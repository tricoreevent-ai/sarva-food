/**
 * RE-EXPORT FROM CENTRALIZED CLIENT
 * Consolidating to src/firebase/client.ts to avoid duplicate initialization.
 */
import { shouldUseFirebase } from "@/lib/env";

export const USE_FIREBASE = shouldUseFirebase();
export {
  analytics,
  app,
  auth,
  db,
  firebaseApp,
  firestore,
  getFirebaseAnalytics,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  isFirebaseConfigured,
  storage,
} from "@/firebase/client";
