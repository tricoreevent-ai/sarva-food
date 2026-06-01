import { getClientEnvironmentConfig } from "@/modules/shared/config/environment/env.client";

export function getFirebaseClientConfigSummary() {
  const env = getClientEnvironmentConfig();
  return {
    projectId: env.firebaseProjectId,
    authDomain: env.firebaseAuthDomain,
    storageBucket: env.firebaseStorageBucket,
    configured: Boolean(env.firebaseProjectId && env.firebaseAuthDomain && env.firebaseStorageBucket),
    useFirebase: env.useFirebase,
    useEmulators: env.useEmulators,
  };
}
