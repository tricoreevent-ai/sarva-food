import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { canAccessOperationalFeature } from "@/lib/operational-access";
import { getSessionFromRequest, type VerifiedSession } from "@/lib/server-auth";
import type { AccessOperation, OwnerFeatureKey } from "@/lib/access-control";

export async function requireOwnerFeature(
  request: NextRequest,
  feature: OwnerFeatureKey,
  operation: AccessOperation = "read",
): Promise<{ session: VerifiedSession; error: null } | { session: null; error: NextResponse }> {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !canAccessOperationalFeature(session, feature, operation)) {
    return {
      session: null,
      error: NextResponse.json({ error: `Permission denied for ${feature}:${operation}.` }, { status: 403 }),
    };
  }
  return { session, error: null };
}
