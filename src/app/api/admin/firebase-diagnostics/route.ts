import { NextResponse, type NextRequest } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { adminAuth, adminDb, adminStorage } from "@/firebase/admin";
import { getServerEnvironmentConfig } from "@/modules/shared/config/environment/env.server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";
import {
  REQUIRED_FIRESTORE_COLLECTIONS,
  type FirebaseDiagnosticItem,
  type FirebaseDiagnostics,
} from "@/types/firebase-diagnostics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const startupOnly = request.nextUrl.searchParams.get("scope") === "startup";
  const env = getServerEnvironmentConfig();
  const localServiceAccountAvailable = existsSync(join(process.cwd(), "service-account-key.json"));
  const items: FirebaseDiagnosticItem[] = [];
  const collections: FirebaseDiagnosticItem[] = [];

  items.push({
    label: "Environment flag",
    status: env.useFirebase ? "pass" : "warn",
    detail: env.useFirebase ? "Firebase is enabled for this environment." : "Firebase is disabled by environment configuration.",
  });

  items.push({
    label: "Client configuration",
    status: env.publicFirebaseProjectId ? "pass" : "fail",
    detail: env.publicFirebaseProjectId ? `Public project ${env.publicFirebaseProjectId}` : "Public Firebase project id is missing.",
  });

  items.push({
    label: "Admin credentials",
    status: env.firebaseAdminConfigured || localServiceAccountAvailable ? "pass" : "warn",
    detail: env.firebaseAdminConfigured
      ? `Admin SDK project ${env.adminFirebaseProjectId || env.publicFirebaseProjectId}`
      : localServiceAccountAvailable
        ? "Local service account file is available for development diagnostics."
      : "Admin SDK env values are not fully configured; local service account or application default credentials may be used.",
  });

  let db: ReturnType<typeof adminDb>;
  try {
    db = adminDb();
    items.push({ label: "Firebase Admin app", status: "pass", detail: "Server Admin SDK initialized." });
  } catch (error) {
    items.push({ label: "Firebase Admin app", status: "fail", detail: messageFor(error) });
    return NextResponse.json({
      data: { generatedAt: new Date().toISOString(), items, collections } satisfies FirebaseDiagnostics,
    });
  }

  try {
    await withTimeout(adminAuth().listUsers(1), 5_000, "Auth health check");
    items.push({ label: "Authentication", status: "pass", detail: "Firebase Auth is reachable from the server." });
  } catch (error) {
    items.push({ label: "Authentication", status: "fail", detail: messageFor(error) });
  }

  try {
    const health = await withTimeout(db.collection("restaurants").limit(1).get(), 5_000, "Firestore health check");
    items.push({
      label: "Firestore",
      status: "pass",
      detail: health.empty ? "Reachable; no restaurant documents sampled." : "Reachable with restaurant data.",
    });
  } catch (error) {
    items.push({ label: "Firestore", status: "fail", detail: messageFor(error) });
  }

  try {
    if (!env.publicFirebaseStorageBucket) {
      items.push({ label: "Storage", status: "warn", detail: "Storage bucket is not configured." });
    } else {
      await withTimeout(adminStorage().bucket(env.publicFirebaseStorageBucket).exists(), 5_000, "Storage health check");
      items.push({ label: "Storage", status: "pass", detail: `Storage bucket ${env.publicFirebaseStorageBucket} is reachable.` });
    }
  } catch (error) {
    items.push({ label: "Storage", status: "fail", detail: messageFor(error) });
  }

  if (startupOnly) {
    return NextResponse.json({
      data: { generatedAt: new Date().toISOString(), items, collections } satisfies FirebaseDiagnostics,
    });
  }

  for (const collectionName of REQUIRED_FIRESTORE_COLLECTIONS) {
    try {
      const ref = db.collection(collectionName);
      const [sampleSnapshot, countSnapshot] = await Promise.all([
        withTimeout(ref.limit(1).get(), 5_000, `${collectionName} sample`),
        withTimeout(ref.count().get(), 5_000, `${collectionName} count`).catch(() => null),
      ]);
      const count = countSnapshot?.data().count;
      collections.push({
        label: collectionName,
        status: sampleSnapshot.empty ? "warn" : "pass",
        detail: sampleSnapshot.empty
          ? "Reachable but empty. Run seed initializer if this collection is required."
          : `${typeof count === "number" ? `${count} documents. ` : ""}Reachable from server.`,
        metric: typeof count === "number" ? count : undefined,
      });
    } catch (error) {
      collections.push({ label: collectionName, status: "fail", detail: messageFor(error) });
    }
  }

  for (const check of [
    {
      label: "Kitchen queue index",
      run: () => db
        .collection("kitchenOrders")
        .where("tenantId", "==", DEFAULT_TENANT_ID)
        .where("branchId", "==", DEFAULT_BRANCH_ID)
        .where("status", "in", ["new", "preparing", "ready"])
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
    },
    {
      label: "Accounting date index",
      run: () => db
        .collection("accountingEntries")
        .where("tenantId", "==", DEFAULT_TENANT_ID)
        .where("branchId", "==", DEFAULT_BRANCH_ID)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
    },
    {
      label: "Customer phone index",
      run: () => db
        .collection("customers")
        .where("tenantId", "==", DEFAULT_TENANT_ID)
        .where("normalizedPhone", "==", "9900001111")
        .limit(1)
        .get(),
    },
  ]) {
    try {
      await withTimeout(check.run(), 5_000, check.label);
      items.push({ label: check.label, status: "pass", detail: "Indexed query succeeded from server diagnostics." });
    } catch (error) {
      items.push({ label: check.label, status: "fail", detail: messageFor(error) });
    }
  }

  return NextResponse.json({
    data: { generatedAt: new Date().toISOString(), items, collections } satisfies FirebaseDiagnostics,
  });
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Firebase error.";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}
