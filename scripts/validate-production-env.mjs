import nextEnv from "@next/env";
import { check, envValue, isHttpsUrl, isPlaceholder, releaseVersion, summarize, writeReport } from "./release/verification-utils.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });

const expectedVersion = releaseVersion();
const required = [
  ["NEXT_PUBLIC_APP_ENV", "Release Metadata", "selects production-safe behavior", "runtime configuration", "set to production"],
  ["NEXT_PUBLIC_APP_URL", "Infrastructure", "creates canonical links and trusted origins", "public URL and mutation-origin validation", "set the final HTTPS origin"],
  ["NEXT_PUBLIC_APP_VERSION", "Release Metadata", "identifies the deployed release", "release and health endpoints", `set to ${expectedVersion}`],
  ["NEXT_PUBLIC_USE_FIREBASE", "Firebase", "enables the production data plane", "Firebase client bootstrap", "set to true"],
  ["NEXT_PUBLIC_FIREBASE_API_KEY", "Firebase", "initializes the Firebase web client", "src/firebase/client.ts", "copy the web-app value from Firebase Console"],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "Authentication", "enables Firebase browser authentication", "src/firebase/client.ts", "copy the Firebase auth domain"],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "Firebase", "selects the production tenant database", "Firebase client and repository layer", "copy the production project id"],
  ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "Firebase", "selects production object storage", "Firebase client and health checks", "copy the production storage bucket"],
  ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "Notifications", "identifies the Firebase web application", "Firebase client bootstrap", "copy the web-app sender id"],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", "Firebase", "identifies the Firebase web application", "Firebase client bootstrap", "copy the web-app id"],
  ["FIREBASE_ADMIN_PROJECT_ID", "Firebase", "authorizes server-side tenant operations on Hostinger", "src/firebase/admin.ts", "set the service-account project id"],
  ["FIREBASE_ADMIN_CLIENT_EMAIL", "Firebase", "identifies the server service account", "src/firebase/admin.ts", "set the service-account client email"],
  ["FIREBASE_ADMIN_PRIVATE_KEY", "Security", "signs Firebase Admin requests", "src/firebase/admin.ts", "set the full PEM value with escaped newlines"],
  ["TABLE_QR_SECRET", "QR", "prevents forged table sessions", "table QR signing and verification", "generate and retain a random value of at least 32 characters"],
  ["PAYMENT_SETTINGS_ENCRYPTION_KEY", "Payments", "protects owner-managed payment credentials at rest", "payment settings encryption", "generate and retain a random value of at least 32 characters"],
];
const optionalGroups = [
  [["NEXT_PUBLIC_FIREBASE_VAPID_KEY"], "Notifications", "Web Push remains unavailable", "configure the Firebase Web Push public key when push is enabled"],
  [["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "DATABASE_ALERT_EMAIL"], "Notifications", "email notifications and outage alerts remain unavailable", "configure the SMTP group and alert recipient together"],
  [["NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"], "Infrastructure", "interactive map features remain unavailable", "configure a restricted production Mapbox public token"],
  [["NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"], "Authentication", "Google sign-in remains unavailable; other login methods still work", "configure one production OAuth client and matching server secret"],
  [["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"], "Infrastructure", "signed media uploads remain unavailable", "configure one Cloudinary account or CLOUDINARY_URL"],
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

for (const [key, category, why, usedAt, fix] of required) {
  const value = envValue(key);
  checks.push(check(`required:${key}`, value ? "PASS" : "ERROR", value ? "configured" : `Required because it ${why}. Used by ${usedAt}. Fix: ${fix}.`, { category, classification: "Required" }));
  if (value && isPlaceholder(value)) checks.push(check(`placeholder:${key}`, "ERROR", `A placeholder cannot initialize production safely. Used by ${usedAt}. Fix: ${fix}.`, { category, classification: "Required" }));
}
for (const [keys, category, impact, fix] of optionalGroups) {
  const missing = keys.filter((key) => !envValue(key));
  checks.push(check(`optional:${category.toLowerCase().replaceAll(" ", "-")}`, missing.length ? "WARNING" : "PASS", missing.length ? `${impact}. Missing: ${missing.join(", ")}. Fix: ${fix}.` : "configured", { category, classification: "Recommended" }));
}

for (const [key, detail] of Object.entries(deprecated)) {
  if (envValue(key)) checks.push(check(`deprecated:${key}`, "WARNING", detail));
}

if (envValue("NEXT_PUBLIC_APP_VERSION")) checks.push(check("version:NEXT_PUBLIC_APP_VERSION", envValue("NEXT_PUBLIC_APP_VERSION") === expectedVersion ? "PASS" : "ERROR", `expected ${expectedVersion}`));
if (envValue("NEXT_PUBLIC_APP_ENV")) checks.push(check("environment:NEXT_PUBLIC_APP_ENV", envValue("NEXT_PUBLIC_APP_ENV") === "production" ? "PASS" : "ERROR", "must be production"));
if (envValue("NEXT_PUBLIC_APP_URL")) checks.push(check("url:NEXT_PUBLIC_APP_URL", isHttpsUrl(envValue("NEXT_PUBLIC_APP_URL")) ? "PASS" : "ERROR", "must be a valid https URL"));
const shortLinkOrigin = envValue("NEXT_PUBLIC_SHORT_LINK_ORIGIN");
checks.push(check("url:NEXT_PUBLIC_SHORT_LINK_ORIGIN", !shortLinkOrigin ? "WARNING" : isHttpsUrl(shortLinkOrigin) ? "PASS" : "ERROR", shortLinkOrigin ? "must be a valid branded https origin" : "missing; smart links will safely use NEXT_PUBLIC_APP_URL"));
checks.push(check("whatsapp:cloud-api", envValue("WHATSAPP_CLOUD_API_TOKEN") ? "PASS" : "MANUAL", "optional for sharing links; required only for automated outbound WhatsApp messages"));
checks.push(check("monitoring:sentry", envValue("NEXT_PUBLIC_SENTRY_DSN") ? "PASS" : "WARNING", "missing; first-party structured monitoring remains active but external alerting is unavailable"));
if (envValue("NEXT_PUBLIC_USE_FIREBASE")) checks.push(check("firebase:NEXT_PUBLIC_USE_FIREBASE", envValue("NEXT_PUBLIC_USE_FIREBASE") === "true" ? "PASS" : "ERROR", "must be true"));
checks.push(check("firebase:emulators", envValue("NEXT_PUBLIC_FIREBASE_USE_EMULATORS") === "true" ? "ERROR" : "PASS", "must not be true in production; absence safely defaults to false"));
checks.push(check("login:dev", envValue("NEXT_PUBLIC_ENABLE_DEV_LOGIN") === "true" ? "ERROR" : "PASS", "must not be true in production; absence safely defaults to false"));
checks.push(check("login:test", envValue("NEXT_PUBLIC_ENABLE_TEST_LOGIN") === "true" ? "ERROR" : "PASS", "must not be true in production; absence safely defaults to false"));
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

for (const item of checks) {
  item.category ??= categoryFor(item.name);
  item.classification ??= item.status === "ERROR" || item.status === "FAIL" ? "Required" : item.status === "WARNING" ? "Recommended" : item.status === "MANUAL" ? "Optional" : "Required";
  if (item.status === "ERROR" && !item.detail.includes("Fix:")) {
    item.detail = `${item.detail}. Required to prevent unsafe or ambiguous production startup. Used by ${item.category} configuration. Fix: set the documented production value and rerun npm run validate:prod-env.`;
  }
}
const categories = [...new Set(checks.map(({ category }) => category))];
const sections = categories.map((category) => ({
  title: category,
  body: checks.filter((item) => item.category === category).map((item) => `- **${item.status}** \`${item.name}\`: ${item.detail}`).join("\n"),
}));
const { summary } = writeReport("PRODUCTION_ENV_VALIDATION_REPORT", "Production Environment Validation Report", checks, sections);
console.log(`Production env validation: ${JSON.stringify(summary.counts)}`);
process.exit(summarize(checks).exitCode);

function validateFirebase() {
  const apiKey = envValue("NEXT_PUBLIC_FIREBASE_API_KEY");
  const appId = envValue("NEXT_PUBLIC_FIREBASE_APP_ID");
  const sender = envValue("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  const project = envValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (apiKey) checks.push(check("firebase:api-key-format", /^AIza[0-9A-Za-z_-]{20,}$/.test(apiKey) ? "PASS" : "ERROR", "client api key must look like a Firebase web key"));
  if (appId) checks.push(check("firebase:app-id-format", /^1:\d+:web:[0-9a-f]+$/i.test(appId) ? "PASS" : "ERROR", "app id must match 1:<sender>:web:<hash>"));
  if (sender) checks.push(check("firebase:sender-format", /^\d{6,}$/.test(sender) ? "PASS" : "ERROR", "messaging sender id must be numeric"));
  if (envValue("FIREBASE_ADMIN_PROJECT_ID")) checks.push(check("firebase:admin-project-match", envValue("FIREBASE_ADMIN_PROJECT_ID") === project ? "PASS" : "ERROR", "admin and public project ids must match"));
  if (envValue("FIREBASE_ADMIN_CLIENT_EMAIL")) checks.push(check("firebase:admin-email", /@.+\.iam\.gserviceaccount\.com$/.test(envValue("FIREBASE_ADMIN_CLIENT_EMAIL")) ? "PASS" : "ERROR", "admin client email must be a service account"));
  if (envValue("FIREBASE_ADMIN_PRIVATE_KEY")) checks.push(check("firebase:private-key", normalizePrivateKey(envValue("FIREBASE_ADMIN_PRIVATE_KEY")).includes("BEGIN PRIVATE KEY") ? "PASS" : "ERROR", "private key must be full PEM with escaped newlines"));
}

function validateCloudinary() {
  if (![envValue("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"), envValue("CLOUDINARY_CLOUD_NAME"), envValue("CLOUDINARY_API_KEY"), envValue("CLOUDINARY_API_SECRET")].some(Boolean)) return;
  checks.push(check("cloudinary:cloud-name-match", envValue("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME") === envValue("CLOUDINARY_CLOUD_NAME") ? "PASS" : "ERROR", "public and server cloud names must match"));
  checks.push(check("cloudinary:cloud-name-format", /^[a-z0-9_-]+$/i.test(envValue("CLOUDINARY_CLOUD_NAME")) ? "PASS" : "ERROR", "cloud name format"));
  checks.push(check("cloudinary:api-key-format", /^\d{6,}$/.test(envValue("CLOUDINARY_API_KEY")) ? "PASS" : "ERROR", "api key should be numeric"));
}

function validateRazorpay() {
  const publicKey = envValue("NEXT_PUBLIC_RAZORPAY_KEY_ID");
  const serverKey = envValue("RAZORPAY_KEY_ID");
  const secret = envValue("RAZORPAY_KEY_SECRET");
  const webhook = envValue("RAZORPAY_WEBHOOK_SECRET");
  const globalConfigured = Boolean(publicKey || serverKey || secret || webhook);
  if (!globalConfigured) {
    checks.push(check("razorpay:configuration", "MANUAL", "owner-scoped configuration required; global fallback intentionally disabled"));
    return;
  }
  checks.push(check("razorpay:public-key", /^rzp_live_/.test(publicKey) ? "PASS" : "ERROR", "global fallback production key must start rzp_live_"));
  checks.push(check("razorpay:key-match", publicKey === serverKey ? "PASS" : "ERROR", "global fallback public/server key ids must match"));
  checks.push(check("razorpay:secret-strength", secret.length >= 24 ? "PASS" : "ERROR", "global fallback secret must be configured"));
  checks.push(check("razorpay:webhook-strength", webhook.length >= 24 ? "PASS" : "ERROR", "global fallback webhook secret must be configured"));
}

function validateSmtp() {
  if (![envValue("SMTP_HOST"), envValue("SMTP_PORT"), envValue("SMTP_USER"), envValue("SMTP_PASS"), envValue("SMTP_FROM")].some(Boolean)) return;
  const port = Number(envValue("SMTP_PORT"));
  checks.push(check("smtp:port", Number.isInteger(port) && port > 0 ? "PASS" : "ERROR", "port must be positive integer"));
  checks.push(check("smtp:secure", ["true", "false"].includes(envValue("SMTP_SECURE")) ? "PASS" : "ERROR", "SMTP_SECURE must be true or false"));
  checks.push(check("smtp:from", /@/.test(envValue("SMTP_FROM")) ? "PASS" : "ERROR", "SMTP_FROM must include email address"));
  const pass = envValue("SMTP_PASS").replace(/\s+/g, "");
  checks.push(check("smtp:gmail-app-password", envValue("SMTP_HOST").includes("gmail") && !/^[a-z0-9]{16}$/i.test(pass) ? "WARNING" : "PASS", "Gmail should use a 16-character app password"));
}

function validateOauth() {
  if (![envValue("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID"), envValue("GOOGLE_OAUTH_CLIENT_ID"), envValue("GOOGLE_OAUTH_CLIENT_SECRET")].some(Boolean)) return;
  checks.push(check("oauth:client-match", envValue("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID") === envValue("GOOGLE_OAUTH_CLIENT_ID") ? "PASS" : "ERROR", "public/server OAuth client ids must match"));
  checks.push(check("oauth:client-format", /\.apps\.googleusercontent\.com$/.test(envValue("GOOGLE_OAUTH_CLIENT_ID")) ? "PASS" : "ERROR", "Google OAuth client id format"));
}

function validateSecrets() {
  for (const [key, min] of [["TABLE_QR_SECRET", 32], ["PAYMENT_SETTINGS_ENCRYPTION_KEY", 32]]) {
    const value = envValue(key);
    if (value) checks.push(check(`secret:${key}`, value.length >= min ? "PASS" : "ERROR", `minimum ${min} characters`));
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

function categoryFor(name) {
  if (name.includes("firebase")) return "Firebase";
  if (name.includes("oauth") || name.includes("login")) return "Authentication";
  if (name.includes("razorpay") || name.includes("PAYMENT")) return "Payments";
  if (name.includes("whatsapp") || name.includes("short-link")) return "Marketing";
  if (name.includes("QR")) return "QR";
  if (name.includes("smtp") || name.includes("VAPID")) return "Notifications";
  if (name.includes("DATABASE")) return "Database";
  if (name.includes("secret") || name.includes("dev") || name.includes("test")) return "Security";
  if (name.includes("sentry") || name.includes("monitoring")) return "Monitoring";
  if (name.includes("version") || name.includes("environment")) return "Release Metadata";
  return "Infrastructure";
}
