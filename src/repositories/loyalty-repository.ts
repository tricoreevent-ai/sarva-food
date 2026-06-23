import "server-only";

import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { resolveTenantId } from "@/lib/tenant";
import type { OrderDoc } from "@/types/firebase";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "VIP";

export type LoyaltyRules = {
  id: string;
  tenantId: string;
  restaurantId: string;
  pointsPerRupee: number;
  signupBonus: number;
  birthdayBonus: number;
  referralBonus: number;
  tierThresholds: Record<LoyaltyTier, number>;
};

export const defaultLoyaltyRules: Omit<LoyaltyRules, "id" | "tenantId" | "restaurantId"> = {
  pointsPerRupee: 0.01,
  signupBonus: 0,
  birthdayBonus: 0,
  referralBonus: 0,
  tierThresholds: { Bronze: 0, Silver: 5_000, Gold: 15_000, Platinum: 50_000, VIP: 100_000 },
};

export class LoyaltyRepository {
  private readonly db = adminDb();

  async getRules(tenantId: string): Promise<LoyaltyRules> {
    const id = resolveTenantId(tenantId);
    const snapshot = await this.db.collection("loyaltyRules").doc(id).get();
    return normalizeRules(id, snapshot.data());
  }

  async list(scope: TenantScope) {
    return (await readTenantDocs(this.db, "loyaltyCustomers", scope))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .sort((first, second) => Number(second.lifetimeValue ?? 0) - Number(first.lifetimeValue ?? 0));
  }

  async prepareOrderAccrual(
    transaction: Transaction,
    input: { customerId: string; order: OrderDoc; lifetimeValue: number; totalOrders: number },
  ) {
    const tenantId = resolveTenantId(input.order.tenantId || input.order.restaurantId);
    const rulesRef = this.db.collection("loyaltyRules").doc(tenantId);
    const loyaltyRef = this.db.collection("loyaltyCustomers").doc(input.customerId);
    const [rulesSnapshot, loyaltySnapshot] = await Promise.all([transaction.get(rulesRef), transaction.get(loyaltyRef)]);
    const rules = normalizeRules(tenantId, rulesSnapshot.data());
    const previous = loyaltySnapshot.data() ?? {};
    const points = Math.max(0, Math.floor(input.order.total * rules.pointsPerRupee));
    const totalPoints = Math.max(0, Number(previous.points ?? 0) + points);
    const tier = tierForLifetimeValue(input.lifetimeValue, rules.tierThresholds);
    const now = new Date();

    return {
      loyaltyRef,
      transactionRef: this.db.collection("customerTransactions").doc(`${input.customerId}-${input.order.id}`),
      loyalty: {
        id: input.customerId,
        tenantId,
        restaurantId: input.order.restaurantId,
        branchId: input.order.branchId,
        customerId: input.customerId,
        points: totalPoints,
        tier,
        totalOrders: input.totalOrders,
        lifetimeValue: input.lifetimeValue,
        lastOrderAt: input.order.createdAt,
        updatedAt: now,
        createdAt: previous.createdAt ?? now,
      },
      transaction: {
        id: `${input.customerId}-${input.order.id}`,
        tenantId,
        restaurantId: input.order.restaurantId,
        branchId: input.order.branchId,
        customerId: input.customerId,
        orderId: input.order.id,
        type: "order-earned",
        points,
        balanceAfter: totalPoints,
        createdAt: now,
        updatedAt: now,
      },
      points,
      tier,
    };
  }

  async saveRules(tenantId: string, patch: Partial<LoyaltyRules>, userId: string) {
    const id = resolveTenantId(tenantId);
    const current = await this.getRules(id);
    const next = normalizeRules(id, { ...current, ...patch });
    await this.db.collection("loyaltyRules").doc(id).set({ ...next, updatedBy: userId, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  }
}

export function tierForLifetimeValue(value: number, thresholds = defaultLoyaltyRules.tierThresholds): LoyaltyTier {
  return (["VIP", "Platinum", "Gold", "Silver", "Bronze"] as const).find((tier) => value >= (thresholds[tier] ?? 0)) ?? "Bronze";
}

function normalizeRules(tenantId: string, value?: Record<string, unknown>): LoyaltyRules {
  const thresholds = value?.tierThresholds && typeof value.tierThresholds === "object"
    ? { ...defaultLoyaltyRules.tierThresholds, ...value.tierThresholds as Partial<Record<LoyaltyTier, number>> }
    : defaultLoyaltyRules.tierThresholds;
  return {
    id: tenantId,
    tenantId,
    restaurantId: String(value?.restaurantId ?? tenantId),
    pointsPerRupee: finite(value?.pointsPerRupee, defaultLoyaltyRules.pointsPerRupee),
    signupBonus: finite(value?.signupBonus, 0),
    birthdayBonus: finite(value?.birthdayBonus, 0),
    referralBonus: finite(value?.referralBonus, 0),
    tierThresholds: Object.fromEntries(Object.entries(thresholds).map(([tier, amount]) => [tier, finite(amount, 0)])) as Record<LoyaltyTier, number>,
  };
}

function finite(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
