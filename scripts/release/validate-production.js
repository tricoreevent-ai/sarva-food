const aliases = [
  ["NEXT_PUBLIC_APP_ENV"],
  ["NEXT_PUBLIC_APP_URL"],
  ["NEXT_PUBLIC_FIREBASE_API_KEY"],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
  ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
  ["NEXT_PUBLIC_FIREBASE_APP_ID"],
  ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_PROJECT_ID"],
  ["FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL"],
  ["FIREBASE_ADMIN_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY"],
  ["SMTP_HOST"],
  ["SMTP_PORT"],
  ["SMTP_USER"],
  ["SMTP_PASS", "SMTP_PASSWORD"],
  ["NEXT_PUBLIC_RAZORPAY_KEY_ID", "RAZORPAY_KEY_ID"],
  ["RAZORPAY_KEY_SECRET", "RAZORPAY_SECRET"],
  ["RAZORPAY_WEBHOOK_SECRET"],
  ["CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME"],
  ["TABLE_QR_SECRET", "QR_SECRET"],
  ["NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"],
  ["GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
  ["NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", "MAPBOX_TOKEN"],
  ["META_APP_ID"],
  ["WHATSAPP_CLOUD_API_TOKEN", "WHATSAPP_ACCESS_TOKEN"],
  ["SMS_PROVIDER"],
];

const missing = aliases.filter((set) => !set.some((key) => has(key)));
const invalid = [];

if (has("NEXT_PUBLIC_APP_URL") && !process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
  invalid.push("NEXT_PUBLIC_APP_URL must use https://.");
}

if (has("NEXT_PUBLIC_APP_ENV") && process.env.NEXT_PUBLIC_APP_ENV !== "production") {
  invalid.push("NEXT_PUBLIC_APP_ENV must be production.");
}

if (has("NEXT_PUBLIC_APP_URL") && process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "") !== "https://violet-squid-380447.hostingersite.com") {
  invalid.push("NEXT_PUBLIC_APP_URL must be https://violet-squid-380447.hostingersite.com for this test release.");
}

const smtpPort = process.env.SMTP_PORT && Number(process.env.SMTP_PORT);
if (process.env.SMTP_PORT && (!Number.isInteger(smtpPort) || smtpPort <= 0)) {
  invalid.push("SMTP_PORT must be a positive integer.");
}

const privateKey = first(["FIREBASE_ADMIN_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY"]);
if (privateKey && !normalizeKey(privateKey).includes("BEGIN PRIVATE KEY")) {
  invalid.push("Firebase private key must contain BEGIN PRIVATE KEY.");
}

const mapbox = first(["NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", "MAPBOX_TOKEN"]);
if (mapbox && /\s/.test(mapbox)) invalid.push("Mapbox token must not contain spaces or line breaks.");

if (missing.length) {
  console.error("Missing production variables:");
  missing.forEach((set) => console.error(`- ${set.join(" or ")}`));
}

if (invalid.length) {
  console.error("Invalid production variables:");
  invalid.forEach((msg) => console.error(`- ${msg}`));
}

if (missing.length || invalid.length) {
  console.error("Production environment validation failed.");
  process.exit(1);
}

console.log("Production environment validation passed.");

function has(key) {
  return Boolean(process.env[key]?.trim());
}

function first(keys) {
  return keys.map((key) => process.env[key]).find((value) => value?.trim())?.trim() || "";
}

function normalizeKey(value) {
  return value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}
