import "server-only";

import Razorpay from "razorpay";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { tenantScope, type TenantScope } from "@/repositories/shared";
import { decryptSecret, encryptSecret, isMaskedSecret, maskSecret } from "@/lib/server/secret-box";
import { resolveTenantId } from "@/lib/tenant";
import type { VerifiedSession } from "@/lib/server-auth";
import type { OrderDoc } from "@/types/firebase";

export const razorpaySampleKeyId = "rzp_test_T9lbdbFplbPTXF";
export const razorpaySampleMerchantId = "T9lUMBJPGiTKrd";
const allowSamplePaymentValues = process.env.NODE_ENV !== "production";
export const restaurantPaymentGatewayNotConfigured = "Restaurant payment gateway is not configured.";

export type RazorpayMethodSettings = {
  upi: boolean;
  card: boolean;
  netbanking: boolean;
  wallet: boolean;
  emi: boolean;
};

export type RazorpayPublicSettings = {
  enabled: boolean;
  mode: "test" | "live";
  keyId: string;
  secretConfigured: boolean;
  secretMasked: string;
  webhookSecretConfigured: boolean;
  webhookSecretMasked: string;
  companyName: string;
  companyLogo: string;
  merchantId: string;
  methods: RazorpayMethodSettings;
  partialPayments: boolean;
  minimumAmount: number;
  maximumAmount: number;
  autoCapture: boolean;
  webhookEnabled: boolean;
  refundEnabled: boolean;
  invoicePrefix: string;
  receiptPrefix: string;
  currency: "INR";
  sampleKeyId: string;
  sampleMerchantId: string;
};

export type RazorpayRuntimeSettings = RazorpayPublicSettings & {
  keySecret: string;
  webhookSecret: string;
  ownerId: string;
  restaurantId: string;
  tenantId: string;
};

type SavedRazorpaySettings = Partial<Omit<RazorpayPublicSettings, "secretConfigured" | "secretMasked" | "webhookSecretConfigured" | "webhookSecretMasked" | "sampleKeyId" | "sampleMerchantId">> & {
  keySecretEncrypted?: string;
  webhookSecretEncrypted?: string;
  keySecret?: string;
  webhookSecret?: string;
  merchantId?: string;
  razorpayEnabled?: boolean;
  razorpayKeyId?: string;
};

type RazorpayClient = {
  orders: {
    all(input: Record<string, unknown>): Promise<unknown>;
    create(input: Record<string, unknown>): Promise<{ id: string; amount: number; currency: "INR"; status?: string; receipt?: string }>;
  };
  payments: {
    fetch(id: string): Promise<RazorpayPaymentEntity>;
    capture(id: string, amount: number, currency: "INR"): Promise<RazorpayPaymentEntity>;
    refund(id: string, input: Record<string, unknown>): Promise<RazorpayRefundEntity>;
  };
};

export type RazorpayPaymentEntity = {
  id: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: "created" | "authorized" | "captured" | "failed" | "refunded";
  method?: string;
  captured?: boolean;
  error_description?: string;
  created_at?: number;
  notes?: Record<string, string>;
};

export type RazorpayRefundEntity = {
  id: string;
  payment_id?: string;
  amount?: number;
  currency?: string;
  status?: "pending" | "processed" | "failed";
  notes?: Record<string, string>;
  created_at?: number;
};

const defaultMethods: RazorpayMethodSettings = {
  upi: true,
  card: true,
  netbanking: true,
  wallet: true,
  emi: false,
};

export async function getOwnerRazorpaySettings(session: VerifiedSession, requestedRestaurantId?: string | null) {
  const scope = tenantScope(session, requestedRestaurantId);
  const raw = await readOwnerRazorpayRaw(session.uid);
  return toPublicSettings(raw, scope.tenantId, session.uid);
}

export async function getOwnerRazorpayRuntimeSettings(session: VerifiedSession, requestedRestaurantId?: string | null) {
  const scope = tenantScope(session, requestedRestaurantId);
  const raw = await readOwnerRazorpayRaw(session.uid);
  return toRuntimeSettings(raw, session.uid, scope.tenantId, scope.tenantId);
}

export async function saveOwnerRazorpaySettings(session: VerifiedSession, input: Record<string, unknown>) {
  const scope = tenantScope(session, stringOrEmpty(input.restaurantId));
  const existing = await readOwnerRazorpayRaw(session.uid);
  const next = sanitizeSettings(input, existing, session.uid);
  const publicConfig = toRestaurantPaymentConfig(next);
  await Promise.all([
    adminDb().collection("ownerProfiles").doc(session.uid).set({
      paymentGatewayConfig: { razorpay: next },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    }, { merge: true }),
    adminDb().collection("restaurants").doc(scope.tenantId).set({
      paymentConfig: publicConfig,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    }, { merge: true }),
  ]);
  return toPublicSettings(next, scope.tenantId, session.uid);
}

export async function resetOwnerRazorpaySettings(session: VerifiedSession, requestedRestaurantId?: string | null) {
  const scope = tenantScope(session, requestedRestaurantId);
  const ownerRef = adminDb().collection("ownerProfiles").doc(session.uid);
  await Promise.all([
    ownerRef.update({
      "paymentGatewayConfig.razorpay": FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    }).catch(() => ownerRef.set({ updatedAt: FieldValue.serverTimestamp(), updatedBy: session.uid }, { merge: true })),
    adminDb().collection("restaurants").doc(scope.tenantId).set({
      paymentConfig: {
        razorpayEnabled: false,
        razorpayKeyId: "",
        razorpayMode: "test",
        razorpayWebhookEnabled: false,
        razorpayRefundEnabled: false,
      },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    }, { merge: true }),
  ]);
  return toPublicSettings({}, scope.tenantId, session.uid);
}

export async function getRazorpayRuntimeForOrder(orderId: string) {
  const orderSnapshot = await adminDb().collection("orders").doc(orderId).get();
  if (!orderSnapshot.exists) throw new Error("Order not found.");
  const order = { id: orderSnapshot.id, ...orderSnapshot.data() } as OrderDoc;
  const restaurantId = resolveTenantId(order.restaurantId || order.tenantId);
  const restaurantSnapshot = await adminDb().collection("restaurants").doc(restaurantId).get();
  const restaurant = restaurantSnapshot.data() as { ownerId?: string; ownerIds?: string[]; paymentConfig?: SavedRazorpaySettings; name?: string; logoPath?: string } | undefined;
  const ownerId = restaurant?.ownerId || restaurant?.ownerIds?.[0] || "";
  const ownerRaw = ownerId ? await readOwnerRazorpayRaw(ownerId) : {};
  const raw = Object.keys(ownerRaw).length ? ownerRaw : (restaurant?.paymentConfig ?? {});
  return {
    order,
    settings: toRuntimeSettings(raw, ownerId, restaurantId, order.tenantId || restaurantId, {
      companyName: restaurant?.name,
      companyLogo: restaurant?.logoPath,
    }),
  };
}

export async function getRazorpayRuntimeForProviderOrder(providerOrderId: string) {
  const intent = await adminDb().collection("paymentIntents").doc(providerOrderId).get();
  const data = intent.data() as { orderId?: string; restaurantId?: string; ownerId?: string; tenantId?: string } | undefined;
  if (data?.orderId) return getRazorpayRuntimeForOrder(data.orderId);
  const restaurantId = resolveTenantId(data?.restaurantId || data?.tenantId || "");
  if (!restaurantId) throw new Error("Payment intent not found.");
  const raw = data?.ownerId ? await readOwnerRazorpayRaw(data.ownerId) : {};
  return {
    order: null,
    settings: toRuntimeSettings(raw, data?.ownerId ?? "", restaurantId, data?.tenantId ?? restaurantId),
  };
}

export function createRazorpayClient(settings: Pick<RazorpayRuntimeSettings, "keyId" | "keySecret">) {
  return new Razorpay({ key_id: settings.keyId, key_secret: settings.keySecret }) as unknown as RazorpayClient;
}

export function withPaymentProviderTimeout<T>(operation: Promise<T>, timeoutMs = 15_000) {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Payment provider request timed out.")), timeoutMs);
  });
  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
}

export function assertRazorpayUsable(settings: RazorpayRuntimeSettings) {
  if (!settings.enabled || !settings.keyId || !settings.keySecret) throw new Error(restaurantPaymentGatewayNotConfigured);
}

export function amountToSubunits(amount: number) {
  return Math.round(Math.max(0, amount) * 100);
}

export function subunitsToAmount(amount?: number) {
  return Math.round(Number(amount ?? 0)) / 100;
}

export function verifyRazorpaySignature(payload: string, signature: string, secret: string) {
  return Razorpay.validateWebhookSignature(payload, signature, secret);
}

export function paymentMethod(method?: string): "cash" | "upi" | "card" | "credit" {
  if (method === "upi") return "upi";
  if (method === "card" || method === "netbanking" || method === "wallet" || method === "emi") return "card";
  return "card";
}

export function scopeFromRazorpayOrder(order: OrderDoc | null, settings: RazorpayRuntimeSettings): TenantScope {
  return { tenantId: resolveTenantId(order?.tenantId || order?.restaurantId || settings.tenantId), branchIds: order?.branchId ? [order.branchId] : [], uid: settings.ownerId };
}

async function readOwnerRazorpayRaw(ownerId: string): Promise<SavedRazorpaySettings> {
  const snapshot = await adminDb().collection("ownerProfiles").doc(ownerId).get();
  const data = snapshot.data() as { paymentGatewayConfig?: { razorpay?: SavedRazorpaySettings }; paymentConfig?: SavedRazorpaySettings } | undefined;
  return data?.paymentGatewayConfig?.razorpay ?? data?.paymentConfig ?? {};
}

function sanitizeSettings(input: Record<string, unknown>, existing: SavedRazorpaySettings, ownerId: string): SavedRazorpaySettings {
  const secret = stringOrEmpty(input.keySecret ?? input.razorpaySecret);
  const webhookSecret = stringOrEmpty(input.webhookSecret);
  const methods = objectOrEmpty(input.methods);
  const currency = stringOrEmpty(input.currency || input.defaultCurrency).toUpperCase() === "INR" ? "INR" : "INR";
  return {
    enabled: Boolean(input.enabled),
    mode: input.mode === "live" ? "live" : "test",
    keyId: stringOrEmpty(input.keyId || input.razorpayKeyId),
    merchantId: stringOrEmpty(input.merchantId).slice(0, 80),
    keySecretEncrypted: secret && !isMaskedSecret(secret) ? encryptSecret(secret, ownerKeyContext(ownerId)) : existing.keySecretEncrypted,
    webhookSecretEncrypted: webhookSecret && !isMaskedSecret(webhookSecret) ? encryptSecret(webhookSecret, ownerKeyContext(ownerId)) : existing.webhookSecretEncrypted,
    companyName: stringOrEmpty(input.companyName).slice(0, 80),
    companyLogo: stringOrEmpty(input.companyLogo),
    methods: {
      upi: bool(methods.upi, true),
      card: bool(methods.card, true),
      netbanking: bool(methods.netbanking, true),
      wallet: bool(methods.wallet, true),
      emi: bool(methods.emi, false),
    },
    partialPayments: Boolean(input.partialPayments),
    minimumAmount: numberOr(input.minimumAmount, 1),
    maximumAmount: numberOr(input.maximumAmount, 500_000),
    autoCapture: bool(input.autoCapture, true),
    webhookEnabled: Boolean(input.webhookEnabled),
    refundEnabled: Boolean(input.refundEnabled),
    invoicePrefix: stringOrEmpty(input.invoicePrefix).slice(0, 12),
    receiptPrefix: stringOrEmpty(input.receiptPrefix || "RCPT").slice(0, 12) || "RCPT",
    currency,
  };
}

function toPublicSettings(raw: SavedRazorpaySettings, restaurantId: string, ownerId = ""): RazorpayPublicSettings {
  const secret = decryptSecret(raw.keySecretEncrypted || raw.keySecret, ownerKeyContext(ownerId));
  const webhookSecret = decryptSecret(raw.webhookSecretEncrypted || raw.webhookSecret, ownerKeyContext(ownerId));
  const settings = normalized(raw);
  return {
    ...settings,
    keyId: settings.keyId || (allowSamplePaymentValues ? razorpaySampleKeyId : ""),
    companyName: settings.companyName || restaurantId,
    secretConfigured: Boolean(secret),
    secretMasked: maskSecret(secret),
    webhookSecretConfigured: Boolean(webhookSecret),
    webhookSecretMasked: maskSecret(webhookSecret),
    sampleKeyId: allowSamplePaymentValues ? razorpaySampleKeyId : "",
    sampleMerchantId: allowSamplePaymentValues ? razorpaySampleMerchantId : "",
  };
}

function toRuntimeSettings(raw: SavedRazorpaySettings, ownerId: string, restaurantId: string, tenantId: string, fallback: { companyName?: string; companyLogo?: string } = {}): RazorpayRuntimeSettings {
  const settings = toPublicSettings(raw, restaurantId, ownerId);
  const keySecret = decryptSecret(raw.keySecretEncrypted || raw.keySecret, ownerKeyContext(ownerId)) || (settings.keyId === process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_SECRET ?? "" : "");
  const webhookSecret = decryptSecret(raw.webhookSecretEncrypted || raw.webhookSecret, ownerKeyContext(ownerId)) || (settings.keyId === process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_WEBHOOK_SECRET ?? "" : "");
  return {
    ...settings,
    enabled: settings.enabled || Boolean(settings.keyId && keySecret && raw.razorpayEnabled),
    companyName: settings.companyName || fallback.companyName || restaurantId,
    companyLogo: settings.companyLogo || fallback.companyLogo || "",
    keySecret,
    webhookSecret,
    ownerId,
    restaurantId,
    tenantId,
  };
}

function normalized(raw: SavedRazorpaySettings): Omit<RazorpayPublicSettings, "secretConfigured" | "secretMasked" | "webhookSecretConfigured" | "webhookSecretMasked" | "sampleKeyId" | "sampleMerchantId"> {
  const methods = objectOrEmpty(raw.methods);
  return {
    enabled: Boolean(raw.enabled ?? raw.razorpayEnabled),
    mode: raw.mode === "live" ? "live" : "test",
    keyId: stringOrEmpty(raw.keyId || raw.razorpayKeyId),
    merchantId: stringOrEmpty(raw.merchantId),
    companyName: stringOrEmpty(raw.companyName),
    companyLogo: stringOrEmpty(raw.companyLogo),
    methods: {
      upi: bool(methods.upi, defaultMethods.upi),
      card: bool(methods.card, defaultMethods.card),
      netbanking: bool(methods.netbanking, defaultMethods.netbanking),
      wallet: bool(methods.wallet, defaultMethods.wallet),
      emi: bool(methods.emi, defaultMethods.emi),
    },
    partialPayments: Boolean(raw.partialPayments),
    minimumAmount: numberOr(raw.minimumAmount, 1),
    maximumAmount: numberOr(raw.maximumAmount, 500_000),
    autoCapture: bool(raw.autoCapture, true),
    webhookEnabled: Boolean(raw.webhookEnabled),
    refundEnabled: Boolean(raw.refundEnabled),
    invoicePrefix: stringOrEmpty(raw.invoicePrefix),
    receiptPrefix: stringOrEmpty(raw.receiptPrefix || "RCPT") || "RCPT",
    currency: "INR",
  };
}

function toRestaurantPaymentConfig(raw: SavedRazorpaySettings) {
  const settings = normalized(raw);
  return {
    razorpayEnabled: settings.enabled,
    razorpayMode: settings.mode,
    razorpayKeyId: settings.keyId,
    razorpayMerchantId: settings.merchantId,
    razorpayCompanyName: settings.companyName,
    razorpayCompanyLogo: settings.companyLogo,
    razorpayMethods: settings.methods,
    razorpayPartialPayments: settings.partialPayments,
    razorpayMinimumAmount: settings.minimumAmount,
    razorpayMaximumAmount: settings.maximumAmount,
    razorpayAutoCapture: settings.autoCapture,
    razorpayWebhookEnabled: settings.webhookEnabled,
    razorpayRefundEnabled: settings.refundEnabled,
    razorpayInvoicePrefix: settings.invoicePrefix,
    razorpayReceiptPrefix: settings.receiptPrefix,
    razorpayCurrency: settings.currency,
  };
}

function ownerKeyContext(ownerId: string) {
  return ownerId ? `owner-payment:${resolveTenantId(ownerId)}` : "platform";
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function objectOrEmpty(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberOr(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
