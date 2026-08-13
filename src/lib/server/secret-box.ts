import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const secretPrefix = "v1:";
const envelopePrefix = "v2:";
const algorithm = "AES-256-GCM";

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

export function encryptSecret(value?: string, context = "platform") {
  const text = value?.trim();
  if (!text) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${secretPrefix}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value?: string, context = "platform") {
  if (!value) return "";
  if (!value.startsWith(secretPrefix)) return value;
  try {
    const [ivRaw, tagRaw, encryptedRaw] = value.slice(secretPrefix.length).split(".");
    if (!ivRaw || !tagRaw || !encryptedRaw) return "";
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivRaw, "base64url"));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    if (context !== "platform") return decryptSecret(value, "platform");
    return "";
  }
}

export function encryptEnvelopeSecret(value?: string, context = "platform") {
  const text = value?.trim();
  if (!text) return "";
  const dataKey = randomBytes(32);
  const dataIv = randomBytes(12);
  const dataCipher = createCipheriv("aes-256-gcm", dataKey, dataIv);
  dataCipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([dataCipher.update(text, "utf8"), dataCipher.final()]);
  const dataTag = dataCipher.getAuthTag();

  const keyIv = randomBytes(12);
  const keyCipher = createCipheriv("aes-256-gcm", secretKey(), keyIv);
  keyCipher.setAAD(Buffer.from(`${context}:dek`));
  const encryptedDataKey = Buffer.concat([keyCipher.update(dataKey), keyCipher.final()]);
  const keyTag = keyCipher.getAuthTag();

  return [
    envelopePrefix,
    "k1",
    algorithm,
    keyIv.toString("base64url"),
    keyTag.toString("base64url"),
    encryptedDataKey.toString("base64url"),
    dataIv.toString("base64url"),
    dataTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptEnvelopeSecret(value?: string, context = "platform") {
  if (!value) return "";
  if (!value.startsWith(envelopePrefix)) return decryptSecret(value, context);
  try {
    const [, keyVersion, storedAlgorithm, keyIvRaw, keyTagRaw, encryptedKeyRaw, dataIvRaw, dataTagRaw, encryptedRaw] = value.split(".");
    if (keyVersion !== "k1" || storedAlgorithm !== algorithm || !keyIvRaw || !keyTagRaw || !encryptedKeyRaw || !dataIvRaw || !dataTagRaw || !encryptedRaw) return "";
    const keyDecipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(keyIvRaw, "base64url"));
    keyDecipher.setAAD(Buffer.from(`${context}:dek`));
    keyDecipher.setAuthTag(Buffer.from(keyTagRaw, "base64url"));
    const dataKey = Buffer.concat([keyDecipher.update(Buffer.from(encryptedKeyRaw, "base64url")), keyDecipher.final()]);
    const decipher = createDecipheriv("aes-256-gcm", dataKey, Buffer.from(dataIvRaw, "base64url"));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(dataTagRaw, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    if (context !== "platform") return decryptEnvelopeSecret(value, "platform");
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
