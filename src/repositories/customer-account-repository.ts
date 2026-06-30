import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { OrderRepository } from "@/repositories/order-repository";
import { dataWithId, dateMs } from "@/repositories/shared";

const resources = {
  addresses: "customerAddresses",
  payments: "customerPaymentMethods",
  savedRestaurants: "customerSavedRestaurants",
  coupons: "customerCoupons",
  reviews: "customerReviews",
} as const;

export type CustomerResource = keyof typeof resources | "profile";

export class CustomerAccountRepository {
  private readonly db = adminDb();
  private readonly orders = new OrderRepository();

  async snapshot(customerId: string) {
    const [profile, addresses, orders, legacyLoyalty, linkedCustomers, payments, savedRestaurants, coupons, reviews, cateringInquiries] = await Promise.all([
      this.db.collection("customerProfiles").doc(customerId).get(),
      this.list("addresses", customerId),
      this.orders.listForCustomer(customerId),
      this.db.collection("customerLoyalty").where("customerId", "==", customerId).limit(1).get(),
      this.db.collection("customers").where("customerUserId", "==", customerId).limit(20).get(),
      this.list("payments", customerId),
      this.list("savedRestaurants", customerId),
      this.list("coupons", customerId),
      this.list("reviews", customerId),
      this.db.collection("cateringQuotes").where("customerId", "==", customerId).limit(50).get(),
    ]);
    const linked = linkedCustomers.docs.sort((a, b) => dateMs(b.data().lastOrderAt) - dateMs(a.data().lastOrderAt))[0];
    const canonicalLoyalty = linked ? await this.db.collection("loyaltyCustomers").doc(linked.id).get() : null;
    return {
      profile: profile.exists ? dataWithId<Record<string, unknown>>(profile.id, profile.data() ?? {}) : null,
      addresses,
      orders,
      loyalty: canonicalLoyalty?.exists
        ? dataWithId<Record<string, unknown>>(canonicalLoyalty.id, canonicalLoyalty.data() ?? {})
        : legacyLoyalty.docs[0]
          ? dataWithId<Record<string, unknown>>(legacyLoyalty.docs[0].id, legacyLoyalty.docs[0].data())
          : null,
      payments,
      savedRestaurants,
      coupons,
      reviews,
      cateringInquiries: cateringInquiries.docs
        .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
        .sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt)),
    };
  }

  async set(customerId: string, resource: CustomerResource, id: string, data: Record<string, unknown>) {
    const collection = resource === "profile" ? "customerProfiles" : resources[resource];
    const ref = this.db.collection(collection).doc(id);
    const existing = await ref.get();
    if (resource === "profile" && id !== customerId) throw new Error("Customer profile id is invalid.");
    if (resource !== "profile" && existing.exists && existing.data()?.customerId !== customerId) throw new Error("Customer record not found.");
    if (resource === "addresses") {
      const incomingCustomerId = String(data.customerId ?? customerId);
      if (incomingCustomerId !== customerId) throw new Error("Address customer id is invalid.");
      const duplicate = await this.findDuplicateAddress(customerId, id, data);
      if (duplicate) throw new Error("This delivery address is already saved.");
    }
    await ref.set(clean({
      ...data,
      id,
      customerId,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
    }), { merge: true });
    if (resource === "profile") {
      await this.db.collection("users").doc(customerId).set(clean({
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        photoURL: data.photoURL,
        updatedAt: FieldValue.serverTimestamp(),
      }), { merge: true });
    }
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  private async findDuplicateAddress(customerId: string, id: string, data: Record<string, unknown>) {
    const label = normalized(data.label);
    const fullAddress = normalized(data.fullAddress ?? data.address);
    const placeId = normalized(data.placeId);
    if (!fullAddress && !placeId) return false;
    const snapshot = await this.db.collection(resources.addresses).where("customerId", "==", customerId).limit(100).get();
    return snapshot.docs.some((doc) => {
      if (doc.id === id) return false;
      const current = doc.data();
      return (
        (placeId && normalized(current.placeId) === placeId) ||
        (label && fullAddress && normalized(current.label) === label && normalized(current.fullAddress ?? current.address) === fullAddress)
      );
    });
  }

  async delete(customerId: string, resource: Exclude<CustomerResource, "profile">, id: string) {
    const ref = this.db.collection(resources[resource]).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.customerId !== customerId) throw new Error("Customer record not found.");
    await ref.delete();
    return { id };
  }

  async createCatering(customerId: string, data: Record<string, unknown>) {
    const ref = this.db.collection("cateringQuotes").doc();
    const subtotal = Math.max(0, Number(data.subtotal ?? 0));
    const serviceFee = Math.max(0, Math.round(subtotal * 0.05));
    const quote = clean({
      ...data,
      id: ref.id,
      customerId,
      status: "new",
      subtotal,
      serviceFee,
      total: subtotal + serviceFee,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await ref.set(quote);
    return dataWithId<Record<string, unknown>>(ref.id, (await ref.get()).data() ?? {});
  }

  private async list(resource: Exclude<CustomerResource, "profile">, customerId: string) {
    const snapshot = await this.db.collection(resources[resource]).where("customerId", "==", customerId).limit(100).get();
    return snapshot.docs.map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()));
  }
}

function clean(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
