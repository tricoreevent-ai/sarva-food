import { NextResponse } from "next/server";
import { getCloudinaryCredentials, signCloudinaryParams } from "@/lib/server/cloudinary";
import { getSessionFromRequest } from "@/lib/server-auth";
import { rateLimit } from "@/lib/rate-limit";

type SignatureBody = {
  folder?: string;
  tags?: string[] | string;
  params?: Record<string, string | number | boolean | undefined>;
};

const defaultFolder = "sarva-food";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request).catch(() => null);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["admin", "super_admin", "owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Upload permission denied." }, { status: 403 });
  }
  if (!rateLimit(`cloudinary-signature:${session.uid}`, 60).ok) {
    return NextResponse.json({ error: "Too many upload requests." }, { status: 429 });
  }

  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as SignatureBody;
  const folder = normalizeFolder(body.folder);
  if (!isAuthorizedFolder(folder, session.role, [...session.tenantIds, ...session.restaurantIds])) {
    return NextResponse.json({ error: "Upload folder permission denied." }, { status: 403 });
  }
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
  return {
    ...(typeof params.transformation === "string" ? { transformation: params.transformation.slice(0, 500) } : {}),
    ...(params.quality_analysis === "false" || params.quality_analysis === false || params.qualityAnalysis === "false" || params.qualityAnalysis === false ? { quality_analysis: "false" } : {}),
  };
}

function isAuthorizedFolder(folder: string, role: string, scopeIds: string[]) {
  if (role === "admin" || role === "super_admin") return true;
  const tenantId = folder.split("/")[1];
  return Boolean(tenantId && scopeIds.includes(tenantId));
}
