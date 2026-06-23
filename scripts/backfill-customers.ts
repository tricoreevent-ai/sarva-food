import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DocumentReference } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");
type RawLine = { menuItemId?: string; name?: string; quantity?: number };
type RawOrder = Record<string, unknown> & { id: string; tenantId?: string; restaurantId?: string; branchId?: string; customerId?: string; customerName?: string; customerPhone?: string; total?: number; createdAt?: unknown; lines?: RawLine[] };
type Rules = { pointsPerRupee: number; tierThresholds: Record<string, number> };
type CustomerGroup = { id: string; tenantId: string; restaurantId: string; branchId?: string; customerUserId?: string; name: string; phone: string; normalizedPhone: string; totalOrders: number; lifetimeValue: number; lastOrderAt: unknown; previousOrderIds: string[]; favoriteItemCounts: Record<string, number>; orders: RawOrder[] };
const { cert, getApps, initializeApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

const accountPath = join(process.cwd(), "service-account-key.json");
if (!existsSync(accountPath)) throw new Error("service-account-key.json is required for the customer backfill.");
const account = JSON.parse(readFileSync(accountPath, "utf8"));
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key }), projectId: account.project_id });
const db = getFirestore(app);
const orders = (await allOrders()).filter((order) => Array.isArray(order.lines));
const groups = new Map<string, CustomerGroup>();
const rules = new Map<string, Rules>();

for (const order of orders) {
  if (!order.tenantId && !order.restaurantId) continue;
  const tenantId = String(order.tenantId ?? order.restaurantId);
  const phone = normalizePhone(String(order.customerPhone ?? ""));
  const key = `cust-${tenantId}-${phone || order.customerId || order.id}`;
  const entry = groups.get(key) ?? { id: key, tenantId, restaurantId: String(order.restaurantId ?? tenantId), branchId: order.branchId, customerUserId: order.customerId, name: String(order.customerName ?? "Walk-in"), phone: String(order.customerPhone ?? ""), normalizedPhone: phone, totalOrders: 0, lifetimeValue: 0, lastOrderAt: null, previousOrderIds: [], favoriteItemCounts: {}, orders: [] } satisfies CustomerGroup;
  entry.totalOrders += 1;
  entry.lifetimeValue += money(order.total);
  entry.previousOrderIds.push(order.id);
  entry.orders.push(order);
  if (!entry.lastOrderAt || dateMs(order.createdAt) > dateMs(entry.lastOrderAt)) entry.lastOrderAt = order.createdAt ?? new Date();
  for (const line of Array.isArray(order.lines) ? order.lines : []) {
    const id = String(line.menuItemId ?? line.name ?? "item");
    entry.favoriteItemCounts[id] = (entry.favoriteItemCounts[id] ?? 0) + Number(line.quantity ?? 0);
  }
  groups.set(key, entry);
}

for (const tenantId of new Set([...groups.values()].map((customer) => customer.tenantId))) {
    const snapshot = await db.collection("loyaltyRules").doc(tenantId).get();
  rules.set(tenantId, normalizeRules(snapshot.data()));
}

console.table([...groups.values()].map((customer) => ({ customerId: customer.id, tenant: customer.tenantId, orders: customer.totalOrders, spend: customer.lifetimeValue, points: pointsFor(customer, rules.get(customer.tenantId) ?? normalizeRules()) })));
console.log(`${apply ? "Applying" : "Dry run"}: ${orders.length} orders -> ${groups.size} customer records in ${account.project_id}.`);

if (apply) await writeBackfill(groups, rules);

async function allOrders(): Promise<RawOrder[]> {
  const rows: RawOrder[] = [];
  let cursor: { id: string } | undefined;
  do {
    let query = db.collection("orders").orderBy("createdAt").limit(400);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    rows.push(...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RawOrder));
    cursor = snapshot.docs.at(-1);
  } while (cursor);
  return rows;
}

async function writeBackfill(customers: Map<string, CustomerGroup>, loyaltyRules: Map<string, Rules>) {
  const writes: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  for (const customer of customers.values()) {
    const rules = loyaltyRules.get(customer.tenantId) ?? normalizeRules();
    const points = pointsFor(customer, rules);
    const tier = tierFor(customer.lifetimeValue, rules.tierThresholds);
    const favoriteItems = Object.entries(customer.favoriteItemCounts).sort(([, first], [, second]) => second - first).slice(0, 8).map(([id]) => id);
    const now = new Date();
    writes.push({ ref: db.collection("customers").doc(customer.id), data: { ...customer, orders: undefined, favoriteItems, loyaltyPoints: points, tier, createdAt: now, updatedAt: now } });
    writes.push({ ref: db.collection("loyaltyCustomers").doc(customer.id), data: { id: customer.id, tenantId: customer.tenantId, restaurantId: customer.restaurantId, branchId: customer.branchId, customerId: customer.id, points, tier, totalOrders: customer.totalOrders, lifetimeValue: customer.lifetimeValue, lastOrderAt: customer.lastOrderAt, createdAt: now, updatedAt: now } });
    for (const order of customer.orders) {
      const earned = Math.max(0, Math.floor(money(order.total) * rules.pointsPerRupee));
      writes.push({ ref: db.collection("customerTransactions").doc(`${customer.id}-${order.id}`), data: { id: `${customer.id}-${order.id}`, tenantId: customer.tenantId, restaurantId: customer.restaurantId, branchId: customer.branchId, customerId: customer.id, orderId: order.id, type: "order-earned", points: earned, createdAt: order.createdAt ?? now, updatedAt: now } });
    }
  }
  for (let index = 0; index < writes.length; index += 450) {
    const batch = db.batch();
    for (const write of writes.slice(index, index + 450)) batch.set(write.ref, removeUndefined(write.data), { merge: true });
    await batch.commit();
  }
  console.log(`Applied ${writes.length} document writes.`);
}

function normalizePhone(value: string) { const digits = value.replace(/\D/g, ""); return digits ? (digits.length <= 10 ? `91${digits}` : digits) : ""; }
function money(value: unknown) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, number) : 0; }
function dateMs(value: unknown) { return value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate().getTime() : new Date(String(value ?? 0)).getTime() || 0; }
function normalizeRules(value?: Record<string, unknown>): Rules { const stored = value?.tierThresholds && typeof value.tierThresholds === "object" ? value.tierThresholds as Record<string, unknown> : {}; const thresholds = Object.fromEntries(Object.entries({ Bronze: 0, Silver: 5_000, Gold: 15_000, Platinum: 50_000, VIP: 100_000, ...stored }).map(([tier, amount]) => [tier, money(amount)])); return { pointsPerRupee: Math.max(0, Number(value?.pointsPerRupee ?? 0.01)), tierThresholds: thresholds }; }
function pointsFor(customer: CustomerGroup, rules: Rules) { return Math.max(0, Math.floor(customer.lifetimeValue * rules.pointsPerRupee)); }
function tierFor(value: number, thresholds: Record<string, number>) { return ["VIP", "Platinum", "Gold", "Silver", "Bronze"].find((tier) => value >= Number(thresholds[tier] ?? 0)) ?? "Bronze"; }
function removeUndefined(value: Record<string, unknown>) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)); }
