import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { canAccessOperationalFeature } from "@/lib/operational-access";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionFromRequest, type VerifiedSession } from "@/lib/server-auth";
import { publicTraceMeta, createTraceContext } from "@/lib/server/request-trace";
import type { AccessOperation, OwnerFeatureKey } from "@/lib/access-control";

export async function requireOwnerFeature(
  request: NextRequest,
  feature: OwnerFeatureKey,
  operation: AccessOperation = "read",
): Promise<{ session: VerifiedSession; error: null } | { session: null; error: NextResponse }> {
  const trace = createTraceContext(request);
  const fail = (error: string, status: number) => NextResponse.json({ error, requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status });
  const originError = sameOriginMutationError(request, fail);
  if (originError) return { session: null, error: originError };

  const session = await getSessionFromRequest(request, "owner");
  if (!session || !canAccessOperationalFeature(session, feature, operation)) {
    return {
      session: null,
      error: fail(`Permission denied for ${feature}:${operation}.`, 403),
    };
  }
  if (request.method !== "GET" && !rateLimit(`owner-api:${session.uid}:${feature}:${operation}`, 180).ok) {
    return {
      session: null,
      error: fail("Too many requests. Please retry shortly.", 429),
    };
  }
  return { session, error: null };
}

function sameOriginMutationError(request: NextRequest, fail: (error: string, status: number) => NextResponse) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    return new URL(origin).origin === request.nextUrl.origin
      ? null
      : fail("Cross-origin request blocked.", 403);
  } catch {
    return fail("Cross-origin request blocked.", 403);
  }
}
