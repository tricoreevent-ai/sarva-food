import "server-only";
import { getServerEnv } from "@/lib/env";

export function getServerEnvironmentConfig() {
  const env = getServerEnv();
  return {
    appEnv: env.NEXT_PUBLIC_APP_ENV,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    publicFirebaseProjectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    adminFirebaseProjectId: env.FIREBASE_ADMIN_PROJECT_ID,
    firebaseAdminConfigured: Boolean(env.FIREBASE_ADMIN_PROJECT_ID && env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY),
    smtpConfigured: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
    cloudinaryConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    googleOAuthConfigured: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET),
    stackConfigured: Boolean(env.STACK_SECRET_SERVER_KEY),
  };
}

