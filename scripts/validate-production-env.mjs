import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), false, {
  info: () => undefined,
  error: () => undefined,
});

const required = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_USE_FIREBASE",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "DATABASE_ALERT_EMAIL",
  "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
  "NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
];

const missing = required.filter((key) => !process.env[key]);
const invalid = [];

if (process.env.NEXT_PUBLIC_APP_ENV && process.env.NEXT_PUBLIC_APP_ENV !== "production") {
  invalid.push("NEXT_PUBLIC_APP_ENV must be production for production deployments.");
}

if (process.env.NEXT_PUBLIC_USE_FIREBASE && process.env.NEXT_PUBLIC_USE_FIREBASE !== "true") {
  invalid.push("NEXT_PUBLIC_USE_FIREBASE must be true.");
}

if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
  invalid.push("NEXT_PUBLIC_APP_URL must use https://.");
}

if (process.env.SMTP_SECURE && !["true", "false"].includes(process.env.SMTP_SECURE)) {
  invalid.push("SMTP_SECURE must be true or false.");
}

if (process.env.SMTP_PORT) {
  const smtpPort = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
    invalid.push("SMTP_PORT must be a valid positive port number.");
  }
}

if (process.env.SMTP_PASS) {
  const smtpPass = process.env.SMTP_HOST?.includes("gmail.com")
    ? process.env.SMTP_PASS.replace(/\s+/g, "")
    : process.env.SMTP_PASS.trim();
  if (/app-password-you-generated|replace[_-]?me|placeholder|your[_-]?smtp[_-]?pass/i.test(smtpPass)) {
    invalid.push("SMTP_PASS is still a placeholder.");
  }
  if (process.env.SMTP_HOST?.includes("gmail.com") && !/^[a-z0-9]{16}$/i.test(smtpPass)) {
    invalid.push("Gmail SMTP_PASS must be a 16 character App Password without spaces.");
  }
}

if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && /\s/.test(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)) {
  invalid.push("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN must not contain spaces or line breaks.");
}

const normalizedPrivateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

if (normalizedPrivateKey && !normalizedPrivateKey.includes("BEGIN PRIVATE KEY")) {
  invalid.push("FIREBASE_ADMIN_PRIVATE_KEY must contain the full service account private key.");
}

if (normalizedPrivateKey && !normalizedPrivateKey.includes("\n")) {
  invalid.push("FIREBASE_ADMIN_PRIVATE_KEY must include newline separators. Use escaped \\n line breaks in hosting variables.");
}

const razorpayKeys = ["NEXT_PUBLIC_RAZORPAY_KEY_ID", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"];
if (razorpayKeys.some((key) => process.env[key]) && razorpayKeys.some((key) => !process.env[key])) {
  invalid.push("Razorpay variables are optional, but if one is set all Razorpay key and webhook variables must be set.");
}

if (
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID &&
  process.env.GOOGLE_OAUTH_CLIENT_ID &&
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID !== process.env.GOOGLE_OAUTH_CLIENT_ID
) {
  invalid.push("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_ID must match.");
}

if (missing.length || invalid.length) {
  console.error("Production environment validation failed.");
  if (missing.length) console.error(`Missing: ${missing.join(", ")}`);
  invalid.forEach((message) => console.error(message));
  process.exit(1);
}

console.log("Production environment validation passed.");

function normalizePrivateKey(value) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}
