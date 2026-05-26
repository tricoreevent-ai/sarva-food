import { z } from "zod";

const stageSchema = z.enum(["development", "staging", "production"]).default("development");
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());
const optionalString = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: stageSchema,
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_USE_FIREBASE: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_FIREBASE_USE_EMULATORS: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_FIREBASE_API_KEY: optionalString,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optionalString,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: optionalString,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_APP_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: optionalString,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: optionalString,
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: optionalString,
  NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID: optionalString,
  NEXT_PUBLIC_LAUNCH_RESTAURANT_IDS: optionalString,
  NEXT_PUBLIC_ENABLE_TEST_LOGIN: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_ENABLE_DEV_LOGIN: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

const serverEnvSchema = clientEnvSchema.extend({
  FIREBASE_ADMIN_PROJECT_ID: optionalString,
  FIREBASE_ADMIN_CLIENT_EMAIL: optionalString,
  FIREBASE_ADMIN_PRIVATE_KEY: optionalString,
  GOOGLE_OAUTH_CLIENT_ID: optionalString,
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString,
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  UPI_MERCHANT_ID: optionalString,
  UPI_MERCHANT_VPA: optionalString,
  WHATSAPP_CLOUD_API_TOKEN: optionalString,
  WHATSAPP_PHONE_NUMBER_ID: optionalString,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalString,
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_FROM: optionalString,
  SENTRY_DSN: optionalUrl,
});

export type AppStage = z.infer<typeof stageSchema>;

export function getClientEnv() {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_USE_FIREBASE: process.env.NEXT_PUBLIC_USE_FIREBASE,
    NEXT_PUBLIC_FIREBASE_USE_EMULATORS: process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
    NEXT_PUBLIC_LAUNCH_RESTAURANT_IDS: process.env.NEXT_PUBLIC_LAUNCH_RESTAURANT_IDS,
    NEXT_PUBLIC_ENABLE_TEST_LOGIN: process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN,
    NEXT_PUBLIC_ENABLE_DEV_LOGIN: process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

export function shouldUseFirebase() {
  return getClientEnv().NEXT_PUBLIC_USE_FIREBASE === "true";
}

export function shouldUseEmulators() {
  return getClientEnv().NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";
}

export function shouldEnableTestLogin() {
  return shouldEnableDevLogin();
}

export function shouldEnableDevLogin() {
  const env = getClientEnv();
  const explicitlyConfigured =
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== undefined ||
    process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN !== undefined;

  return process.env.NODE_ENV !== "production"
    && (
      env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true" ||
      env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === "true" ||
      (!explicitlyConfigured && env.NEXT_PUBLIC_APP_ENV === "development")
    );
}

export function requireServerEnv(keys: Array<keyof z.infer<typeof serverEnvSchema>>) {
  const env = getServerEnv();
  const missing = keys.filter((key) => !env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment values: ${missing.join(", ")}`);
  }

  return env;
}
