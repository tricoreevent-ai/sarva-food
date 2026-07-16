import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { canAccessOperationalFeature } from "@/lib/operational-access";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionFromRequest, type VerifiedSession } from "@/lib/server-auth";
import { publicTraceMeta, createTraceContext } from "@/lib/server/request-trace";
import { getConfiguredPublicAppUrl } from "@/lib/server/public-app-url";
import { isTrustedMutationOrigin } from "@/lib/server/mutation-origin";
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
  return isTrustedMutationOrigin({
    method: request.method,
    origin: request.headers.get("origin"),
    requestOrigin: request.nextUrl.origin,
    requestHost: request.headers.get("host"),
    publicOrigin: getConfiguredPublicAppUrl(),
  })
    ? null
    : fail("Cross-origin request blocked.", 403);
}
