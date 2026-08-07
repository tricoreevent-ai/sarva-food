import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const secretPrefix = "v1:";

function secretKey() {
  if (process.env.NODE_ENV === "production" && !process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY) {
    throw new Error("Payment settings encryption is not configured.");
  }
  const material =
    process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    "nammude-local-payment-settings";
  return createHash("sha256").update(material).digest();
}

export function encryptSecret(value?: string) {
  const text = value?.trim();
  if (!text) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${secretPrefix}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value?: string) {
  if (!value) return "";
  if (!value.startsWith(secretPrefix)) return value;
  try {
    const [ivRaw, tagRaw, encryptedRaw] = value.slice(secretPrefix.length).split(".");
    if (!ivRaw || !tagRaw || !encryptedRaw) return "";
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

export function maskSecret(value?: string) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export function isMaskedSecret(value?: string) {
  return Boolean(value && (/[*]/.test(value) || value === "__preserve__"));
}
