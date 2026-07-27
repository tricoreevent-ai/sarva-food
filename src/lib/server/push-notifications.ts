import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { BRAND_CONFIG } from "@/config/branding";
import { APP_NAME } from "@/lib/constants";
import { adminApp, adminDb } from "@/firebase/admin";
import { tenantAliases } from "@/lib/tenant";
import type { TenantScope } from "@/repositories/shared";
import type { VerifiedSession } from "@/lib/server-auth";
import type { UserRole } from "@/types/firebase";

type PushSurface = "customer" | "owner" | "admin" | "kitchen" | "pos" | "waiter";
type PushPriority = "normal" | "high";

export type PushNotificationInput = {
  notificationId?: string;
  type: string;
  title: string;
  message: string;
  priority?: PushPriority;
  orderId?: string;
  kitchenOrderId?: string;
  link?: string;
  audience?: string[];
  targetUserIds?: string[];
  sound?: string;
};

type PushTokenRecord = {
  token: string;
  tokenHash: string;
  active: boolean;
  role?: UserRole;
  surface?: PushSurface;
  tenantId?: string;
  tenantIds?: string[];
  restaurantIds?: string[];
  branchIds?: string[];
  userAgent?: string;
  platform?: string;
  permission?: NotificationPermission | "unknown";
  createdAt?: string;
  lastSeenAt?: string;
};

type TokenTarget = {
  uid: string;
  ref: DocumentReference;
  record: PushTokenRecord;
};

const MAX_TOKENS_PER_USER = 8;
const MAX_PUSH_ATTEMPTS = 3;
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-argument",
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

export async function registerUserPushToken(
  session: VerifiedSession,
  input: {
    token?: string;
    surface?: string;
    userAgent?: string;
    platform?: string;
    permission?: string;
  },
) {
  const token = normalizeToken(input.token);
  if (!token) throw new Error("Valid push token is required.");

  const now = new Date().toISOString();
  const ref = adminDb().collection("user_preferences").doc(session.uid);
  const snapshot = await ref.get();
  const tokenHash = hashToken(token);
  const records = pushTokenRecords(snapshot.data()?.pushTokens)
    .filter((item) => item.tokenHash !== tokenHash && item.active !== false)
    .slice(-(MAX_TOKENS_PER_USER - 1));

  records.push({
    token,
    tokenHash,
    active: true,
    role: session.role,
    surface: normalizeSurface(input.surface),
    tenantId: session.tenantId,
    tenantIds: session.tenantIds,
    restaurantIds: session.restaurantIds,
    branchIds: session.branchIds,
    userAgent: cleanText(input.userAgent, 180),
    platform: cleanText(input.platform, 80),
    permission: normalizePermission(input.permission),
    createdAt: now,
    lastSeenAt: now,
  });

  await ref.set({
    pushEnabled: true,
    pushTokens: records,
    pushUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { ok: true, tokenHash, deviceCount: records.length };
}

export async function removeUserPushToken(
  session: VerifiedSession,
  input: { token?: string; surface?: string } = {},
) {
  const ref = adminDb().collection("user_preferences").doc(session.uid);
  const snapshot = await ref.get();
  const tokenHash = normalizeToken(input.token) ? hashToken(normalizeToken(input.token)) : "";
  const surface = normalizeSurface(input.surface);
  const records = pushTokenRecords(snapshot.data()?.pushTokens).filter((item) => {
    if (tokenHash) return item.tokenHash !== tokenHash;
    if (surface) return item.surface !== surface;
    return false;
  });

  await ref.set({
    pushEnabled: records.length > 0,
    pushTokens: records,
    pushUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { ok: true, deviceCount: records.length };
}

export async function dispatchPendingTenantPushNotifications(scope: TenantScope, max = 10) {
  const snapshot = await adminDb()
    .collection("notifications")
    .where("tenantId", "==", scope.tenantId)
    .where("pushStatus", "==", "pending")
    .limit(max)
    .get();

  for (const item of snapshot.docs) {
    const claimed = await claimPendingNotification(item.ref);
    if (!claimed) continue;
    try {
      await sendTenantPushNotification(scope, {
        notificationId: item.id,
        type: String(claimed.type ?? "notification"),
        title: String(claimed.title ?? APP_NAME),
        message: String(claimed.message ?? ""),
        priority: claimed.priority === "high" ? "high" : "normal",
        orderId: typeof claimed.orderId === "string" ? claimed.orderId : undefined,
        kitchenOrderId: typeof claimed.kitchenOrderId === "string" ? claimed.kitchenOrderId : undefined,
        link: typeof claimed.link === "string" ? claimed.link : undefined,
        audience: Array.isArray(claimed.audience) ? claimed.audience.map(String) : undefined,
        targetUserIds: Array.isArray(claimed.targetUserIds) ? claimed.targetUserIds.map(String) : undefined,
        sound: typeof claimed.sound === "string" ? claimed.sound : undefined,
      });
    } catch (error) {
      await recoverFailedNotification(item.ref, Number(claimed.pushAttempts ?? 0) + 1, error);
    }
  }
}

async function recoverFailedNotification(ref: DocumentReference, attempt: number, error: unknown) {
  const retry = attempt < MAX_PUSH_ATTEMPTS;
  await ref.set({
    pushStatus: retry ? "pending" : "failed",
    pushFailureCount: FieldValue.increment(1),
    pushLastError: error instanceof Error ? error.name : "Error",
    pushAttemptedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function sendTenantPushNotification(scope: TenantScope, input: PushNotificationInput) {
  const notificationRef = input.notificationId ? adminDb().collection("notifications").doc(input.notificationId) : null;
  const targets = await pushTargetsForTenant(scope, input.audience, input.targetUserIds);
  if (!targets.length) {
    await notificationRef?.set({
      pushStatus: "no_tokens",
      pushedAt: FieldValue.serverTimestamp(),
      pushSuccessCount: 0,
      pushFailureCount: 0,
    }, { merge: true });
    return { successCount: 0, failureCount: 0 };
  }

  const link = safeLink(input.link || linkForNotification(input));
  const data = cleanData({
    notificationId: input.notificationId,
    type: input.type,
    title: input.title,
    body: input.message,
    link,
    orderId: input.orderId,
    kitchenOrderId: input.kitchenOrderId,
    sound: input.sound || soundForType(input.type),
    priority: input.priority ?? "normal",
  });

  const response = await getMessaging(adminApp()).sendEachForMulticast({
    tokens: targets.map((target) => target.record.token),
    notification: {
      title: input.title,
      body: input.message,
    },
    data,
    webpush: {
      fcmOptions: { link },
      notification: {
        title: input.title,
        body: input.message,
        icon: BRAND_CONFIG.assets.notificationIcon,
        badge: BRAND_CONFIG.assets.notificationBadge,
        tag: input.notificationId || `${scope.tenantId}:${input.type}:${input.orderId ?? ""}`,
        renotify: input.priority === "high",
        requireInteraction: input.priority === "high",
        data,
      },
    },
  });

  const invalidTargets = response.responses
    .map((item, index) => item.success ? null : { target: targets[index], code: item.error?.code ?? "" })
    .filter((item): item is { target: TokenTarget; code: string } => Boolean(item && INVALID_TOKEN_CODES.has(item.code)));

  await cleanupInvalidTokens(invalidTargets.map((item) => item.target));
  await notificationRef?.set({
    pushStatus: response.failureCount ? response.successCount ? "partial_failed" : "failed" : "sent",
    pushSuccessCount: response.successCount,
    pushFailureCount: response.failureCount,
    pushedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { successCount: response.successCount, failureCount: response.failureCount };
}

async function claimPendingNotification(ref: DocumentReference) {
  return adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    if (!snapshot.exists || data?.pushStatus !== "pending") return null;
    transaction.set(ref, {
      pushStatus: "dispatching",
      pushAttempts: FieldValue.increment(1),
      pushAttemptedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return data;
  });
}

async function pushTargetsForTenant(scope: TenantScope, audience: string[] = ["owner", "manager", "cashier", "waiter", "kitchen"], targetUserIds: string[] = []) {
  const ids = tenantAliases(scope.tenantId);
  const targetSet = new Set(targetUserIds.filter(Boolean));
  const db = adminDb();
  const snapshots = await Promise.all([
    ...ids.map((id) => db.collection("users").where("tenantIds", "array-contains", id).limit(120).get()),
    ...ids.map((id) => db.collection("users").where("restaurantIds", "array-contains", id).limit(120).get()),
    ...ids.map((id) => db.collection("users").where("tenantId", "==", id).limit(120).get()),
  ]);
  const users = Array.from(new Map(
    snapshots
      .flatMap((snapshot) => snapshot.docs)
      .map((doc) => [doc.id, { id: doc.id, ...doc.data() } as DocumentData & { id: string }]),
  ).values())
    .filter((user) => user.active !== false && roleMatchesAudience(String(user.role ?? ""), audience))
    .filter((user) => !targetSet.size || targetSet.has(user.id));

  if (!users.length) return [];

  const refs = users.map((user) => db.collection("user_preferences").doc(user.id));
  const prefs = await db.getAll(...refs);
  const targets = new Map<string, TokenTarget>();
  prefs.forEach((snapshot, index) => {
    const records = pushTokenRecords(snapshot.data()?.pushTokens);
    for (const record of records) {
      if (record.active === false || !record.token) continue;
      targets.set(record.tokenHash || hashToken(record.token), {
        uid: users[index].id,
        ref: snapshot.ref,
        record,
      });
    }
  });

  return Array.from(targets.values());
}

async function cleanupInvalidTokens(targets: TokenTarget[]) {
  const grouped = new Map<string, { ref: DocumentReference; hashes: Set<string> }>();
  for (const target of targets) {
    const current = grouped.get(target.uid) ?? { ref: target.ref, hashes: new Set<string>() };
    current.hashes.add(target.record.tokenHash || hashToken(target.record.token));
    grouped.set(target.uid, current);
  }

  await Promise.all(Array.from(grouped.values()).map(async ({ ref, hashes }) => {
    const snapshot = await ref.get();
    const records = pushTokenRecords(snapshot.data()?.pushTokens).filter((item) => !hashes.has(item.tokenHash || hashToken(item.token)));
    await ref.set({
      pushTokens: records,
      pushEnabled: records.length > 0,
      pushUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }));
}

function pushTokenRecords(value: unknown): PushTokenRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item && typeof item === "object" ? item as PushTokenRecord : null)
    .filter((item): item is PushTokenRecord => Boolean(item?.token && item.tokenHash));
}

function normalizeToken(value?: string) {
  const token = String(value ?? "").trim();
  return token.length >= 20 && token.length <= 4096 ? token : "";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeSurface(value?: string): PushSurface {
  if (value === "admin" || value === "kitchen" || value === "pos" || value === "waiter" || value === "customer") return value;
  return "owner";
}

function normalizePermission(value?: string): NotificationPermission | "unknown" {
  return value === "granted" || value === "denied" || value === "default" ? value : "unknown";
}

function cleanText(value: unknown, max: number) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : undefined;
}

function roleMatchesAudience(role: string, audience: string[]) {
  if (audience.includes(role)) return true;
  if (audience.includes("kitchen") && (role === "chef" || role === "kitchen-manager")) return true;
  if (audience.includes("owner") && role === "manager") return true;
  return false;
}

function linkForNotification(input: PushNotificationInput) {
  if (input.type === "ready" || input.kitchenOrderId) return "/owner/kitchen";
  if (input.type === "payment") return "/owner/pos";
  if (input.orderId) return `/owner/orders?orderId=${encodeURIComponent(input.orderId)}`;
  return "/owner/orders";
}

function safeLink(value: string) {
  if (!value) return "/owner/orders";
  try {
    const url = new URL(value, "https://example.com");
    return url.origin === "https://example.com" ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/owner/orders";
  }
}

function soundForType(type: string) {
  if (type === "ready") return "kitchen-alert";
  if (type === "payment") return "pos-alert";
  if (type === "new_order") return "loud-alarm";
  return "bell";
}

function cleanData(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  );
}
