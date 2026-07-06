import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { canAccessOperationalFeature } from "@/lib/operational-access";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionFromRequest, type VerifiedSession } from "@/lib/server-auth";
import type { AccessOperation, OwnerFeatureKey } from "@/lib/access-control";

export async function requireOwnerFeature(
  request: NextRequest,
  feature: OwnerFeatureKey,
  operation: AccessOperation = "read",
): Promise<{ session: VerifiedSession; error: null } | { session: null; error: NextResponse }> {
  const originError = sameOriginMutationError(request);
  if (originError) return { session: null, error: originError };

  const session = await getSessionFromRequest(request, "owner");
  if (!session || !canAccessOperationalFeature(session, feature, operation)) {
    return {
      session: null,
      error: NextResponse.json({ error: `Permission denied for ${feature}:${operation}.` }, { status: 403 }),
    };
  }
  if (request.method !== "GET" && !rateLimit(`owner-api:${session.uid}:${feature}:${operation}`, 180).ok) {
    return {
      session: null,
      error: NextResponse.json({ error: "Too many requests. Please retry shortly." }, { status: 429 }),
    };
  }
  return { session, error: null };
}

function sameOriginMutationError(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    return new URL(origin).origin === request.nextUrl.origin
      ? null
      : NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
}
