import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import type { OrderDoc } from "@/types/firebase";
import { CustomerRepository } from "@/repositories/customer-repository";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class OrderRepository {
  private readonly db = adminDb();
  private readonly customers = new CustomerRepository();

  async create(order: OrderDoc, address?: Record<string, unknown>) {
    await this.db.runTransaction(async (transaction) => {
      const customer = await this.customers.prepareOrderUpsert(transaction, order);
      const now = new Date();
      transaction.set(this.db.collection("orders").doc(order.id), order);
      transaction.set(this.db.collection("customerOrders").doc(order.id), order);
      transaction.set(customer.customerRef, customer.customer, { merge: true });
      transaction.set(customer.loyalty.loyaltyRef, customer.loyalty.loyalty, { merge: true });
      transaction.set(customer.loyalty.transactionRef, customer.loyalty.transaction, { merge: true });
      for (const line of order.lines) {
        if (!line.menuItemId || line.quantity <= 0) continue;
        const patch = { orderCount: FieldValue.increment(line.quantity), updatedAt: now };
        transaction.set(this.db.collection("menus").doc(line.menuItemId), patch, { merge: true });
        transaction.set(this.db.collection("menuItems").doc(line.menuItemId), patch, { merge: true });
      }
      if (address) transaction.set(this.db.collection("customerAddresses").doc(String(address.id)), address, { merge: true });
    });
    return order;
  }

  async list(scope: TenantScope, options: { from?: Date; to?: Date; limit?: number } = {}) {
    const rows = (await readTenantDocs(this.db, "orders", scope, ["tenantId", "restaurantId"], options.limit ?? 1_000))
      .map((doc) => dataWithId<OrderDoc>(doc.id, doc.data()))
      .filter((order) => !options.from || dateMs(order.createdAt) >= options.from.getTime())
      .filter((order) => !options.to || dateMs(order.createdAt) <= options.to.getTime())
      .sort((first, second) => dateMs(second.createdAt) - dateMs(first.createdAt));
    return rows;
  }

  async summary(scope: TenantScope, options: { from?: Date; to?: Date } = {}) {
    const orders = await this.list(scope, options);
    const billable = orders.filter((order) => !["cancelled", "rejected"].includes(order.status));
    const revenue = billable.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
    const tax = billable.reduce((sum, order) => sum + Number(order.tax ?? 0), 0);
    const active = orders.filter((order) => !["cancelled", "rejected", "delivered", "completed"].includes(order.status));
    return { orders, orderCount: orders.length, billableOrderCount: billable.length, revenue, tax, activeOrderCount: active.length };
  }

  async updateStatus(scope: TenantScope, orderId: string, status: OrderDoc["status"]) {
    const ref = this.db.collection("orders").doc(orderId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("Order not found.");
    const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
    if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
    await Promise.all([
      ref.set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      this.db.collection("customerOrders").doc(orderId).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    ]);
    return { ...order, status };
  }
}
