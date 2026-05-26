import { NextResponse } from "next/server";
import { getCloudinaryCredentials, signCloudinaryParams } from "@/lib/server/cloudinary";

type SignatureBody = {
  folder?: string;
  tags?: string[] | string;
  params?: Record<string, string | number | boolean | undefined>;
};

const defaultFolder = "sarva-food";

export async function POST(request: Request) {
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as SignatureBody;
  const folder = normalizeFolder(body.folder);
  const tags = normalizeTags(body.tags);
  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    timestamp,
    folder,
    tags,
    use_filename: true,
    unique_filename: true,
    ...normalizeSignatureParams(body.params),
  };
  const signedTimestamp = Number(params.timestamp) || timestamp;

  return NextResponse.json({
    cloudName: credentials.cloudName,
    apiKey: credentials.apiKey,
    timestamp: signedTimestamp,
    folder,
    tags,
    signature: signCloudinaryParams(params, credentials.apiSecret),
  });
}

function normalizeFolder(value?: string) {
  const safe = (value || defaultFolder)
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/(^-|-$)/g, ""))
    .filter(Boolean)
    .join("/");
  return safe.startsWith(defaultFolder) ? safe : `${defaultFolder}/${safe || "uploads"}`;
}

function normalizeTags(value?: string[] | string) {
  const tags = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return tags.map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")).filter(Boolean).join(",");
}

function normalizeSignatureParams(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return {};
  const aliases: Record<string, string> = {
    apiKey: "api_key",
    publicId: "public_id",
    uploadPreset: "upload_preset",
    uniqueFilename: "unique_filename",
    useFilename: "use_filename",
    uploadSignatureTimestamp: "timestamp",
    resourceType: "resource_type",
    qualityAnalysis: "quality_analysis",
  };
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [aliases[key] ?? key, value]),
  );
}
