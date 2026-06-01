import { getClientEnv } from "@/lib/env";

export function getClientEnvironmentConfig() {
  const env = getClientEnv();
  return {
    appEnv: env.NEXT_PUBLIC_APP_ENV,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    useFirebase: env.NEXT_PUBLIC_USE_FIREBASE === "true",
    useEmulators: env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true",
    firebaseProjectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseAuthDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseStorageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    mapboxConfigured: Boolean(env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN),
    cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    googleOAuthConfigured: Boolean(env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID),
    stackConfigured: Boolean(env.NEXT_PUBLIC_STACK_PROJECT_ID && env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY),
  };
}

