import "server-only";

import os from "node:os";
import { adminApp, adminDb, adminStorage } from "@/firebase/admin";
import { COLLECTIONS } from "@/firebase/collections";
import { APP_NAME } from "@/lib/constants";
import { RELEASE_BRANCH, RELEASE_MARKER, RELEASE_VERSION } from "@/lib/release";
import { getBuildCommit } from "@/lib/server/build-info";
import { getCloudinaryCredentials } from "@/lib/server/cloudinary";
import { getConfiguredPublicAppUrl } from "@/lib/server/public-app-url";
import { getServerEnvironmentConfig } from "@/modules/shared/config/environment/env.server";

export type HealthCheckKind = "live" | "ready" | "startup";

export const healthHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
};

const activeKitchenStatuses = new Set(["new", "accepted", "preparing", "ready", "served"]);

export async function buildHealthSnapshot(kind: HealthCheckKind) {
  const started = performance.now();
  const config = getConfigurationSnapshot();
  const shouldProbe = kind !== "live";
  const [firestoreConnectivity, storageConnectivity] = await Promise.all([
    shouldProbe ? probeFirestoreConnectivity() : Promise.resolve(status("not_checked")),
    shouldProbe ? probeStorageConnectivity() : Promise.resolve(status("not_checked")),
  ]);
  const issues = [
    config.firebaseConfiguration.publicConfigured ? "" : "firebase_public_config_missing",
    config.firebaseConfiguration.adminConfigured || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG ? "" : "firebase_admin_config_missing",
    firestoreConnectivity.status === "connected" || kind === "live" ? "" : "firestore_unavailable",
    storageConnectivity.status === "configured" || kind === "live" ? "" : "storage_unavailable",
  ].filter(Boolean);

  return {
    status: issues.length ? "degraded" : "ok",
    check: kind,
    appName: APP_NAME,
    releaseMarker: RELEASE_MARKER,
    applicationVersion: process.env.NEXT_PUBLIC_APP_VERSION || RELEASE_VERSION,
    gitSha: getBuildCommit(),
    releaseBranch: process.env.HOSTINGER_GIT_BRANCH || process.env.NEXT_PUBLIC_GIT_BRANCH || RELEASE_BRANCH,
    deploymentEnvironment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "production",
    publicAppUrl: getConfiguredPublicAppUrl(),
    buildTimestamp: process.env.NEXT_PUBLIC_BUILD_DATE || process.env.NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP || process.env.BUILD_DATE || "not provided",
    runtimeStatus: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeEnv: process.env.NODE_ENV || "production",
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memoryUsage: getMemoryUsage(),
      cpuEstimation: getCpuEstimation(),
    },
    firestoreConnectivity,
    storageConnectivity,
    smtpAvailability: config.smtpAvailability,
    cloudinaryAvailability: config.cloudinaryAvailability,
    razorpayConfiguration: config.razorpayConfiguration,
    firebaseConfiguration: config.firebaseConfiguration,
    issues,
    generatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
  };
}

export function healthStatusCode(snapshot: Awaited<ReturnType<typeof buildHealthSnapshot>>) {
  return snapshot.check === "live" || snapshot.status === "ok" ? 200 : 503;
}

export function getOperationalDiagnostics(input: {
  tenantCount?: number | null;
  openOrders?: number | null;
  kitchenOrders?: Array<{ status?: string }>;
  kitchenQueueCount?: number | null;
  posDraftCount?: number | null;
  notificationQueueCount?: number | null;
  firestoreLatencyMs?: number | null;
} = {}) {
  const kitchenQueueCount = input.kitchenQueueCount ?? input.kitchenOrders?.filter((order) => activeKitchenStatuses.has(String(order.status ?? ""))).length ?? null;
  const slowQueryThresholdMs = 1000;
  return {
    realtimeListenerCount: {
      serverGlobal: 0,
      routeOwned: 1,
      note: "Kitchen SSE and browser Firestore listeners are route-owned and cleanup-scoped.",
    },
    cacheStatus: {
      publicCatalog: "bounded-server-cache",
      dynamicRoutes: "no-store",
      serviceWorkerDynamicBypass: true,
    },
    pendingQueueCount: 0,
    notificationQueue: {
      pending: input.notificationQueueCount ?? null,
      status: "stored-notification-read-model",
    },
    kitchenQueue: {
      active: kitchenQueueCount,
      status: kitchenQueueCount === null ? "not_checked" : "measured",
    },
    posQueue: {
      drafts: input.posDraftCount ?? null,
      status: input.posDraftCount === null || input.posDraftCount === undefined ? "not_checked" : "measured",
    },
    firestoreStatus: input.firestoreLatencyMs === null || input.firestoreLatencyMs === undefined ? "not_checked" : "connected",
    tenantCount: input.tenantCount ?? null,
    openOrders: input.openOrders ?? null,
    kitchenLoad: kitchenQueueCount,
    memoryUsage: getMemoryUsage(),
    cpuEstimation: getCpuEstimation(),
    slowQueryDetection: {
      thresholdMs: slowQueryThresholdMs,
      observedMs: input.firestoreLatencyMs ?? null,
      status: input.firestoreLatencyMs !== null && input.firestoreLatencyMs !== undefined && input.firestoreLatencyMs > slowQueryThresholdMs ? "attention" : "ok",
    },
  };
}

function getConfigurationSnapshot() {
  const env = getServerEnvironmentConfig();
  const cloudinary = getCloudinaryCredentials();
  return {
    smtpAvailability: {
      status: env.smtpConfigured ? "configured" : "missing",
      fromConfigured: Boolean(process.env.SMTP_FROM || process.env.SMTP_USER),
    },
    cloudinaryAvailability: {
      status: cloudinary ? "configured" : "missing",
      publicCloudNameConfigured: Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME),
      serverCredentialsConfigured: Boolean(cloudinary),
    },
    razorpayConfiguration: {
      status: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? "configured" : "owner_scoped_or_missing",
      publicKeyConfigured: Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
      serverKeyConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      ownerScopedSettings: true,
    },
    firebaseConfiguration: {
      useFirebase: env.useFirebase,
      publicConfigured: Boolean(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
          env.publicFirebaseProjectId &&
          env.publicFirebaseStorageBucket &&
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
          process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      ),
      adminConfigured: env.firebaseAdminConfigured,
      storageBucketConfigured: Boolean(env.publicFirebaseStorageBucket),
      vapidConfigured: Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY),
    },
  };
}

async function probeFirestoreConnectivity() {
  const started = performance.now();
  try {
    await adminDb().collection(COLLECTIONS.restaurants).limit(1).get();
    return status("connected", started);
  } catch {
    return status("unavailable", started);
  }
}

async function probeStorageConnectivity() {
  const started = performance.now();
  try {
    const bucketName = adminStorage().bucket().name || adminApp().options.storageBucket;
    return { ...status(bucketName ? "configured" : "missing", started), bucketConfigured: Boolean(bucketName) };
  } catch {
    return status("unavailable", started);
  }
}

function status(value: string, started?: number) {
  return {
    status: value,
    ...(started === undefined ? {} : { latencyMs: Math.round(performance.now() - started) }),
  };
}

function getMemoryUsage() {
  const memory = process.memoryUsage();
  return {
    rssMb: mb(memory.rss),
    heapTotalMb: mb(memory.heapTotal),
    heapUsedMb: mb(memory.heapUsed),
    externalMb: mb(memory.external),
    arrayBuffersMb: mb(memory.arrayBuffers),
  };
}

function getCpuEstimation() {
  const cpu = process.cpuUsage();
  return {
    userMs: Math.round(cpu.user / 1000),
    systemMs: Math.round(cpu.system / 1000),
    loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
    availableParallelism: typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length,
  };
}

function mb(value: number) {
  return Number((value / 1024 / 1024).toFixed(2));
}
