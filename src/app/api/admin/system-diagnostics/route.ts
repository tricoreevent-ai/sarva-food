import { NextResponse, type NextRequest } from "next/server";
import { CMS_COLLECTIONS, CMS_VERSION, REQUIRED_CMS_FIELDS } from "@/modules/shared/config/environment/cms.config";
import { getServerEnvironmentConfig } from "@/modules/shared/config/environment/env.server";
import { adminDb } from "@/firebase/admin";
import { COLLECTIONS } from "@/firebase/collections";
import { parseFirestoreDateIso } from "@/lib/firestore-date";
import { getSessionFromRequest } from "@/lib/server-auth";
import { getOperationalDiagnostics } from "@/lib/server/production-health";
import { productionLogger } from "@/lib/server/production-logger";
import { createTraceContext, extendTrace, publicTraceMeta, traceDurationMs, traceLogFields } from "@/lib/server/request-trace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let trace = createTraceContext(request);
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access is required.", requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status: 403 });
  }
  trace = extendTrace(trace, { userId: session.uid });

  try {
  const env = getServerEnvironmentConfig();
  const started = performance.now();
  const db = adminDb();
  const cmsSnapshot = await db.collection(CMS_COLLECTIONS.systemSettings).doc(CMS_COLLECTIONS.cmsDocumentId).get();
  const cmsData = cmsSnapshot.exists ? cmsSnapshot.data() : undefined;
  const latencyMs = Math.round(performance.now() - started);

  const collectionChecks = await Promise.all(
    [
      CMS_COLLECTIONS.systemSettings,
      CMS_COLLECTIONS.foodCategories,
      CMS_COLLECTIONS.cuisineTypes,
      CMS_COLLECTIONS.homepageBanners,
      CMS_COLLECTIONS.legacyFoodCategories,
      CMS_COLLECTIONS.legacyCuisineTypes,
    ].map(async (collectionName) => {
      const start = performance.now();
      try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        return {
          collectionName,
          exists: !snapshot.empty,
          latencyMs: Math.round(performance.now() - start),
        };
      } catch (error) {
        return {
          collectionName,
          exists: false,
          latencyMs: Math.round(performance.now() - start),
          error: error instanceof Error ? error.name : "CollectionCheckFailed",
        };
      }
    }),
  );
  const [tenantCount, openOrders, kitchenLoad, notificationQueueCount] = await Promise.all([
    readCount(db.collection(COLLECTIONS.restaurants)),
    readCount(db.collection(COLLECTIONS.orders).where("status", "in", ["new", "accepted", "preparing", "ready", "served", "draft"])),
    readCount(db.collection(COLLECTIONS.kitchenOrders).where("status", "in", ["new", "accepted", "preparing", "ready", "served"])),
    readCount(db.collection(COLLECTIONS.notifications).where("read", "==", false)),
  ]);

  return NextResponse.json({
    data: {
      firebaseProjectId: env.adminFirebaseProjectId || env.publicFirebaseProjectId || "not configured",
      publicFirebaseProjectId: env.publicFirebaseProjectId,
      activeEnvironment: env.appEnv,
      cmsVersion: String(cmsData?.cmsVersion ?? CMS_VERSION),
      lastSync: stringifyFirestoreDate(cmsData?.updatedAt) ?? stringifyFirestoreDate(cmsData?.modifiedAt) ?? cmsData?.lastPublishedAt ?? "not published",
      missingFields: REQUIRED_CMS_FIELDS.filter((field) => !hasDeepValue(cmsData, field)),
      missingCollections: collectionChecks.filter((check) => !check.exists).map((check) => check.collectionName),
      collectionChecks,
      firestoreLatencyMs: latencyMs,
      firebaseAdminConfigured: env.firebaseAdminConfigured,
      cloudinaryConfigured: env.cloudinaryConfigured,
      smtpConfigured: env.smtpConfigured,
      googleOAuthConfigured: env.googleOAuthConfigured,
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      deploymentTimestamp: process.env.NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP ?? process.env.VERCEL_GIT_COMMIT_REF ?? "not provided",
      operationalDiagnostics: getOperationalDiagnostics({
        tenantCount,
        openOrders,
        kitchenQueueCount: kitchenLoad,
        notificationQueueCount,
        firestoreLatencyMs: latencyMs,
      }),
      trace: publicTraceMeta(trace),
    },
  });
  } catch (error) {
    productionLogger.admin("admin.system-diagnostics.failed", { ...traceLogFields(trace), durationMs: traceDurationMs(trace), errorName: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ error: "Unable to load system diagnostics.", requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status: 500 });
  }
}

function hasDeepValue(input: Record<string, unknown> | undefined, path: string) {
  if (!input) return false;
  let current: unknown = input;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  if (Array.isArray(current)) return current.length > 0;
  return current !== undefined && current !== null && current !== "";
}

function stringifyFirestoreDate(value: unknown) {
  return parseFirestoreDateIso(value);
}

async function readCount(query: FirebaseFirestore.Query) {
  const snapshot = await query.count().get();
  return snapshot.data().count;
}
