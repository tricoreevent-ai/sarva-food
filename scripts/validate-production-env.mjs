import nextEnv from "@next/env";
import { check, envValue, isHttpsUrl, isPlaceholder, releaseVersion, summarize, writeReport } from "./release/verification-utils.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });

const expectedVersion = releaseVersion();
const required = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_VERSION",
  "NEXT_PUBLIC_USE_FIREBASE",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "TABLE_QR_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "DATABASE_ALERT_EMAIL",
  "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
  "NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];
const deprecated = {
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "Use NEXT_PUBLIC_FIREBASE_USE_EMULATORS.",
  FIREBASE_PROJECT_ID: "Use FIREBASE_ADMIN_PROJECT_ID.",
  FIREBASE_CLIENT_EMAIL: "Use FIREBASE_ADMIN_CLIENT_EMAIL.",
  FIREBASE_PRIVATE_KEY: "Use FIREBASE_ADMIN_PRIVATE_KEY.",
  SMTP_PASSWORD: "Use SMTP_PASS.",
  RAZORPAY_SECRET: "Use RAZORPAY_KEY_SECRET.",
  GOOGLE_CLIENT_ID: "Use GOOGLE_OAUTH_CLIENT_ID.",
  GOOGLE_CLIENT_SECRET: "Use GOOGLE_OAUTH_CLIENT_SECRET.",
  MAPBOX_TOKEN: "Use NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.",
  WHATSAPP_ACCESS_TOKEN: "Use WHATSAPP_CLOUD_API_TOKEN.",
  QR_SECRET: "Use TABLE_QR_SECRET.",
};

const checks = [];

for (const key of required) {
  const value = envValue(key);
  checks.push(check(`required:${key}`, value ? "PASS" : "ERROR", value ? "configured" : "missing or empty"));
  if (value && isPlaceholder(value)) checks.push(check(`placeholder:${key}`, "ERROR", "value still looks like a placeholder/local example"));
}

for (const [key, detail] of Object.entries(deprecated)) {
  if (envValue(key)) checks.push(check(`deprecated:${key}`, "WARNING", detail));
}

checks.push(check("version:NEXT_PUBLIC_APP_VERSION", envValue("NEXT_PUBLIC_APP_VERSION") === expectedVersion ? "PASS" : "ERROR", `expected ${expectedVersion}`));
checks.push(check("environment:NEXT_PUBLIC_APP_ENV", envValue("NEXT_PUBLIC_APP_ENV") === "production" ? "PASS" : "ERROR", "must be production"));
checks.push(check("url:NEXT_PUBLIC_APP_URL", isHttpsUrl(envValue("NEXT_PUBLIC_APP_URL")) ? "PASS" : "ERROR", "must be a valid https URL"));
checks.push(check("firebase:NEXT_PUBLIC_USE_FIREBASE", envValue("NEXT_PUBLIC_USE_FIREBASE") === "true" ? "PASS" : "ERROR", "must be true"));
checks.push(check("firebase:emulators", envValue("NEXT_PUBLIC_FIREBASE_USE_EMULATORS") === "false" ? "PASS" : "ERROR", "must be false in production"));
checks.push(check("login:dev", envValue("NEXT_PUBLIC_ENABLE_DEV_LOGIN") === "false" ? "PASS" : "ERROR", "must be false in production"));
checks.push(check("login:test", envValue("NEXT_PUBLIC_ENABLE_TEST_LOGIN") === "false" ? "PASS" : "ERROR", "must be false in production"));
checks.push(check("plugins:quality", envValue("NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS") === "true" ? "WARNING" : "PASS", "quality diagnostics should stay disabled unless profiling"));
checks.push(check("plugins:dashboard", envValue("NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD") === "true" ? "ERROR" : "PASS", "developer dashboard must stay disabled"));
checks.push(check("plugins:profiler", envValue("NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER") === "true" ? "ERROR" : "PASS", "plugin profiler must stay disabled unless profiling"));
checks.push(check("plugins:restaurant-health", envValue("NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD") === "true" ? "WARNING" : "PASS", "restaurant health plugin should stay disabled unless running controlled admin smoke"));
for (const key of ["NEXT_PUBLIC_ENABLE_DEVELOPER_CLOCK_WIDGET", "NEXT_PUBLIC_ENABLE_DEVELOPER_NOTES_WIDGET", "NEXT_PUBLIC_ENABLE_SYSTEM_INFORMATION_WIDGET", "NEXT_PUBLIC_ENABLE_THEME_PREVIEW_WIDGET"]) {
  checks.push(check(`plugins:example:${key}`, envValue(key) === "true" ? "ERROR" : "PASS", "example plugin flags must stay disabled in production"));
}

validateFirebase();
validateCloudinary();
validateRazorpay();
validateSmtp();
validateOauth();
validateSecrets();
validateDuplicates();

const { summary } = writeReport("PRODUCTION_ENV_VALIDATION_REPORT", "Production Environment Validation Report", checks);
console.log(`Production env validation: ${JSON.stringify(summary.counts)}`);
process.exit(summarize(checks).exitCode);

function validateFirebase() {
  const apiKey = envValue("NEXT_PUBLIC_FIREBASE_API_KEY");
  const appId = envValue("NEXT_PUBLIC_FIREBASE_APP_ID");
  const sender = envValue("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  const project = envValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  checks.push(check("firebase:api-key-format", /^AIza[0-9A-Za-z_-]{20,}$/.test(apiKey) ? "PASS" : "ERROR", "client api key must look like a Firebase web key"));
  checks.push(check("firebase:app-id-format", /^1:\d+:web:[0-9a-f]+$/i.test(appId) ? "PASS" : "ERROR", "app id must match 1:<sender>:web:<hash>"));
  checks.push(check("firebase:sender-format", /^\d{6,}$/.test(sender) ? "PASS" : "ERROR", "messaging sender id must be numeric"));
  checks.push(check("firebase:admin-project-match", envValue("FIREBASE_ADMIN_PROJECT_ID") === project ? "PASS" : "ERROR", "admin and public project ids must match"));
  checks.push(check("firebase:admin-email", /@.+\.iam\.gserviceaccount\.com$/.test(envValue("FIREBASE_ADMIN_CLIENT_EMAIL")) ? "PASS" : "ERROR", "admin client email must be a service account"));
  checks.push(check("firebase:private-key", normalizePrivateKey(envValue("FIREBASE_ADMIN_PRIVATE_KEY")).includes("BEGIN PRIVATE KEY") ? "PASS" : "ERROR", "private key must be full PEM with escaped newlines"));
}

function validateCloudinary() {
  checks.push(check("cloudinary:cloud-name-match", envValue("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME") === envValue("CLOUDINARY_CLOUD_NAME") ? "PASS" : "ERROR", "public and server cloud names must match"));
  checks.push(check("cloudinary:cloud-name-format", /^[a-z0-9_-]+$/i.test(envValue("CLOUDINARY_CLOUD_NAME")) ? "PASS" : "ERROR", "cloud name format"));
  checks.push(check("cloudinary:api-key-format", /^\d{6,}$/.test(envValue("CLOUDINARY_API_KEY")) ? "PASS" : "ERROR", "api key should be numeric"));
}

function validateRazorpay() {
  checks.push(check("razorpay:public-key", /^rzp_live_/.test(envValue("NEXT_PUBLIC_RAZORPAY_KEY_ID")) ? "PASS" : "ERROR", "production key must start rzp_live_"));
  checks.push(check("razorpay:key-match", envValue("NEXT_PUBLIC_RAZORPAY_KEY_ID") === envValue("RAZORPAY_KEY_ID") ? "PASS" : "ERROR", "public/server key ids must match"));
  checks.push(check("razorpay:secret-strength", envValue("RAZORPAY_KEY_SECRET").length >= 24 ? "PASS" : "ERROR", "secret must be configured"));
  checks.push(check("razorpay:webhook-strength", envValue("RAZORPAY_WEBHOOK_SECRET").length >= 24 ? "PASS" : "ERROR", "webhook secret must be configured"));
}

function validateSmtp() {
  const port = Number(envValue("SMTP_PORT"));
  checks.push(check("smtp:port", Number.isInteger(port) && port > 0 ? "PASS" : "ERROR", "port must be positive integer"));
  checks.push(check("smtp:secure", ["true", "false"].includes(envValue("SMTP_SECURE")) ? "PASS" : "ERROR", "SMTP_SECURE must be true or false"));
  checks.push(check("smtp:from", /@/.test(envValue("SMTP_FROM")) ? "PASS" : "ERROR", "SMTP_FROM must include email address"));
  const pass = envValue("SMTP_PASS").replace(/\s+/g, "");
  checks.push(check("smtp:gmail-app-password", envValue("SMTP_HOST").includes("gmail") && !/^[a-z0-9]{16}$/i.test(pass) ? "WARNING" : "PASS", "Gmail should use a 16-character app password"));
}

function validateOauth() {
  checks.push(check("oauth:client-match", envValue("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID") === envValue("GOOGLE_OAUTH_CLIENT_ID") ? "PASS" : "ERROR", "public/server OAuth client ids must match"));
  checks.push(check("oauth:client-format", /\.apps\.googleusercontent\.com$/.test(envValue("GOOGLE_OAUTH_CLIENT_ID")) ? "PASS" : "ERROR", "Google OAuth client id format"));
}

function validateSecrets() {
  for (const [key, min] of [["TABLE_QR_SECRET", 32], ["PAYMENT_SETTINGS_ENCRYPTION_KEY", 32]]) {
    const value = envValue(key);
    if (key === "PAYMENT_SETTINGS_ENCRYPTION_KEY" && !value) {
      checks.push(check(`secret:${key}`, "WARNING", "recommended for encrypted owner payment settings"));
    } else {
      checks.push(check(`secret:${key}`, value.length >= min ? "PASS" : "ERROR", `minimum ${min} characters`));
    }
  }
}

function validateDuplicates() {
  const pairs = [["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL"], ["NEXT_PUBLIC_BUILD_COMMIT", "NEXT_PUBLIC_GIT_COMMIT_SHA"]];
  for (const [a, b] of pairs) {
    const av = envValue(a);
    const bv = envValue(b);
    if (av && bv && av !== bv) checks.push(check(`duplicate:${a}:${b}`, "WARNING", "duplicate environment values differ"));
  }
}

function normalizePrivateKey(value) {
  return value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}
