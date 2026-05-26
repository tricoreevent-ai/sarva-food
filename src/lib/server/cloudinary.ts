import crypto from "node:crypto";

export type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryCredentials(): CloudinaryCredentials | null {
  const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || parsed?.cloudName;
  const apiKey = process.env.CLOUDINARY_API_KEY || parsed?.apiKey;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || parsed?.apiSecret;

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function signCloudinaryParams(params: Record<string, string | number | boolean | undefined>, apiSecret: string) {
  const source = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "" && value !== false)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${source}${apiSecret}`).digest("hex");
}

function parseCloudinaryUrl(value?: string): CloudinaryCredentials | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "cloudinary:") return null;
    return {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password),
    };
  } catch {
    return null;
  }
}
