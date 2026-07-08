import nextEnv from "@next/env";
import { appUrl, check, envValue, fetchJson, isPlaceholder, summarize, writeReport } from "./verification-utils.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });

const checks = [];
const hosted = await hostedHealth();
const providers = {
  Firebase: ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"],
  Firestore: ["FIREBASE_ADMIN_PROJECT_ID"],
  Authentication: ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  Storage: ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
  Cloudinary: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
  SMTP: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
  "Google OAuth": ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
  Mapbox: ["NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"],
  Razorpay: ["NEXT_PUBLIC_RAZORPAY_KEY_ID", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
  WhatsApp: ["WHATSAPP_CLOUD_API_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_WEBHOOK_VERIFY_TOKEN"],
};

for (const [provider, keys] of Object.entries(providers)) {
  const hostedCheck = hostedProviderStatus(provider, hosted);
  if (hostedCheck) {
    checks.push(hostedCheck);
    continue;
  }
  const missing = keys.filter((key) => !envValue(key) || isPlaceholder(envValue(key)));
  checks.push(check(`provider:${provider}`, missing.length ? "ERROR" : "PASS", missing.length ? `local env missing/placeholder: ${missing.join(", ")}` : "configured"));
}
checks.push(check("provider:live-checks", process.env.PROVIDER_LIVE === "1" ? "WARNING" : "MANUAL", "Set PROVIDER_LIVE=1 and run provider dashboard/API smoke with real credentials."));

const { summary } = writeReport("PROVIDER_VERIFICATION_REPORT", "Provider Verification Report", checks);
console.log(`Provider verification: ${JSON.stringify(summary.counts)}`);
process.exit(summarize(checks).exitCode);

async function hostedHealth() {
  const url = appUrl();
  if (!url?.startsWith("https://")) return null;
  try {
    const result = await fetchJson(`${url}/health/ready`, 20_000);
    return result.ok && result.json ? result.json : null;
  } catch {
    return null;
  }
}

function hostedProviderStatus(provider, health) {
  if (!health) return null;
  const firebase = health.firebaseConfiguration ?? {};
  const storage = health.storageConnectivity ?? {};
  const smtp = health.smtpAvailability ?? {};
  const cloudinary = health.cloudinaryAvailability ?? {};
  const razorpay = health.razorpayConfiguration ?? {};
  if (provider === "Firebase") {
    return check(`provider:${provider}`, firebase.publicConfigured && firebase.adminConfigured ? "PASS" : "ERROR", firebase.publicConfigured && firebase.adminConfigured ? "hosted public/admin Firebase configured" : "hosted Firebase public/admin config incomplete");
  }
  if (provider === "Firestore") {
    return check(`provider:${provider}`, health.firestoreConnectivity?.status === "connected" ? "PASS" : "ERROR", `hosted Firestore status: ${health.firestoreConnectivity?.status ?? "unknown"}`);
  }
  if (provider === "Authentication") {
    return check(`provider:${provider}`, firebase.publicConfigured ? "PASS" : "ERROR", firebase.publicConfigured ? "hosted Firebase public auth config present" : "hosted Firebase public config missing");
  }
  if (provider === "Storage") {
    return check(`provider:${provider}`, storage.status === "configured" && firebase.storageBucketConfigured ? "PASS" : "ERROR", `hosted storage status: ${storage.status ?? "unknown"}`);
  }
  if (provider === "Cloudinary") {
    return check(`provider:${provider}`, cloudinary.status === "configured" ? "PASS" : "ERROR", `hosted Cloudinary status: ${cloudinary.status ?? "unknown"}`);
  }
  if (provider === "SMTP") {
    return check(`provider:${provider}`, smtp.status === "configured" ? "PASS" : "ERROR", `hosted SMTP status: ${smtp.status ?? "unknown"}`);
  }
  if (provider === "Razorpay") {
    if (razorpay.publicKeyConfigured && razorpay.serverKeyConfigured && razorpay.webhookConfigured) {
      return check(`provider:${provider}`, "PASS", "hosted global Razorpay config present");
    }
    return check(`provider:${provider}`, "MANUAL", `hosted status ${razorpay.status ?? "unknown"}; verify owner-scoped settings and dashboard/webhook before enabling live payments`);
  }
  if (provider === "WhatsApp") {
    const missing = providers[provider].filter((key) => !envValue(key) || isPlaceholder(envValue(key)));
    return check(`provider:${provider}`, missing.length ? "MANUAL" : "PASS", missing.length ? "requires Meta/WhatsApp dashboard env verification before Cloud API launch" : "local env configured");
  }
  if (provider === "Google OAuth" || provider === "Mapbox") return null;
  return null;
}
