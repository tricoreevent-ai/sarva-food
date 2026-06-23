import "server-only";

import { type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { resolveTenantId } from "@/lib/tenant";
import type { OrderDoc } from "@/types/firebase";
import { LoyaltyRepository } from "@/repositories/loyalty-repository";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";

type CustomerData = Record<string, unknown> & { id: string; tenantId: string; normalizedPhone: string; name: string; phone: string; totalOrders: number; lifetimeValue: number; loyaltyPoints: number; tier: string };

export class CustomerRepository {
  private readonly db = adminDb();
  private readonly loyalty = new LoyaltyRepository();

  async prepareOrderUpsert(transaction: Transaction, order: OrderDoc) {
    const tenantId = resolveTenantId(order.tenantId || order.restaurantId);
    const customerId = customerIdFor(order);
    const customerRef = this.db.collection("customers").doc(customerId);
    const snapshot = await transaction.get(customerRef);
    const previous = snapshot.data() ?? {};
    const totalOrders = Number(previous.totalOrders ?? 0) + 1;
    const lifetimeValue = Number(previous.lifetimeValue ?? 0) + order.total;
    const favoriteItemCounts = numberMap(previous.favoriteItemCounts);
    for (const line of order.lines) favoriteItemCounts[line.menuItemId || line.name] = (favoriteItemCounts[line.menuItemId || line.name] ?? 0) + line.quantity;
    const favoriteItems = Object.entries(favoriteItemCounts)
      .sort(([, first], [, second]) => second - first)
      .slice(0, 8)
      .map(([id]) => order.lines.find((line) => line.menuItemId === id)?.name ?? id);
    const loyalty = await this.loyalty.prepareOrderAccrual(transaction, { customerId, order, lifetimeValue, totalOrders });
    const now = new Date();

    return {
      customerRef,
      customerId,
      customer: {
        id: customerId,
        tenantId,
        restaurantId: order.restaurantId,
        branchId: order.branchId,
        customerUserId: order.customerId,
        name: order.customerName,
        phone: order.customerPhone,
        normalizedPhone: normalizePhone(order.customerPhone),
        loyaltyPoints: loyalty.points,
        tier: loyalty.tier,
        totalOrders,
        lifetimeValue,
        lastOrderAt: order.createdAt,
        inactiveDays: 0,
        previousOrderIds: [order.id, ...stringArray(previous.previousOrderIds)].slice(0, 50),
        favoriteItemCounts,
        favoriteItems,
        createdAt: previous.createdAt ?? now,
        updatedAt: now,
      },
      loyalty,
    };
  }

  async list(scope: TenantScope, search = "") {
    const needle = search.trim().toLowerCase();
    const customers = (await readTenantDocs(this.db, "customers", scope)).map((doc) => dataWithId<CustomerData>(doc.id, doc.data()));
    return customers
      .filter((customer) => !needle || [customer.name, customer.phone, String(customer.email ?? "")].some((value) => value.toLowerCase().includes(needle)))
      .sort((first, second) => Number(second.lifetimeValue) - Number(first.lifetimeValue) || dateMs(second.lastOrderAt) - dateMs(first.lastOrderAt));
  }

  async detail(scope: TenantScope, customerId: string) {
    const customer = dataWithId<CustomerData>(customerId, (await this.db.collection("customers").doc(customerId).get()).data() ?? {});
    if (!customer.tenantId || resolveTenantId(String(customer.tenantId)) !== scope.tenantId) return null;
    const orders = (await readTenantDocs(this.db, "orders", scope))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((order) => order.customerId === customer.customerUserId || normalizePhone(String(order.customerPhone ?? "")) === customer.normalizedPhone)
      .sort((first, second) => dateMs(second.createdAt) - dateMs(first.createdAt));
    const loyalty = dataWithId<Record<string, unknown>>(customerId, (await this.db.collection("loyaltyCustomers").doc(customerId).get()).data() ?? {});
    return { customer, orders, loyalty };
  }
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 10 ? `91${digits}` : digits;
}

export function customerIdFor(order: Pick<OrderDoc, "tenantId" | "restaurantId" | "customerPhone" | "customerId">) {
  const phone = normalizePhone(order.customerPhone);
  return `cust-${resolveTenantId(order.tenantId || order.restaurantId)}-${phone || order.customerId}`;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, number>;
  return Object.fromEntries(Object.entries(value).filter(([, count]) => Number.isFinite(Number(count))).map(([id, count]) => [id, Number(count)]));
}
