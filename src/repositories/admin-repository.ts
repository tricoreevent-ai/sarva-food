import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";
import { adminAuth, adminDb } from "@/firebase/admin";
import { dataWithId } from "@/repositories/shared";
import { menuDocToMenuItem, orderDocToDemoOrder, staffDocToStaffMember } from "@/lib/operational-api-mappers";
import type { OfferDoc, OrderDoc } from "@/types/firebase";
import type { Offer } from "@/lib/types";

const collections = {
  restaurants: "restaurants",
  staffMembers: "users",
  orders: "orders",
  offers: "offers",
  menuItems: "menus",
  businessApplications: "businessApplications",
  branches: "branches",
  socialPosts: "socialPosts",
  cateringInquiries: "cateringQuotes",
  plans: "plans",
  campaignSettings: "campaignSettings",
} as const;

export type AdminResource = keyof typeof collections;

export class AdminRepository {
  private readonly db = adminDb();

  async snapshot() {
    const entries = await Promise.all(Object.entries(collections).map(async ([key, collection]) => {
      const snapshot = await this.db.collection(collection).limit(2_000).get();
      return [key, snapshot.docs.map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))] as const;
    }));
    const data = Object.fromEntries(entries) as Record<AdminResource, Array<Record<string, unknown>>>;
    return {
      ...data,
      staffMembers: data.staffMembers.filter((user) => user.role !== "customer").map(staffDocToStaffMember),
      orders: data.orders.map((order) => orderDocToDemoOrder(order as unknown as OrderDoc)),
      offers: data.offers.filter((offer) => offer.isDeleted !== true).map((offer) => offerDocToOffer(offer as unknown as OfferDoc)),
      menuItems: data.menuItems.map(menuDocToMenuItem),
    };
  }

  async set(resource: AdminResource, id: string, data: Record<string, unknown>) {
    if (resource === "staffMembers") return this.setAdminUser(id, data);
    const ref = this.db.collection(collections[resource]).doc(id);
    await ref.set(clean({ ...data, id, updatedAt: FieldValue.serverTimestamp() }), { merge: true });
    if (resource === "menuItems") await this.db.collection("menuItems").doc(id).set(clean({ ...data, id, updatedAt: FieldValue.serverTimestamp() }), { merge: true });
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async create(resource: AdminResource, data: Record<string, unknown>) {
    const requestedId = String(data.id || data.slug || "");
    if (resource === "staffMembers") return this.setAdminUser(requestedId, data);
    const ref = requestedId ? this.db.collection(collections[resource]).doc(requestedId) : this.db.collection(collections[resource]).doc();
    await ref.set(clean({ ...data, id: ref.id, createdAt: data.createdAt ?? FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }), { merge: true });
    if (resource === "menuItems") await this.db.collection("menuItems").doc(ref.id).set(clean({ ...data, id: ref.id, createdAt: data.createdAt ?? FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }), { merge: true });
    return dataWithId<Record<string, unknown>>(ref.id, (await ref.get()).data() ?? {});
  }

  async delete(resource: AdminResource, id: string) {
    if (resource === "staffMembers") {
      await adminAuth().deleteUser(id).catch(() => undefined);
    }
    await this.db.collection(collections[resource]).doc(id).delete();
    if (resource === "menuItems") await this.db.collection("menuItems").doc(id).delete();
    return { id };
  }

  async setAdminDisabled(id: string, disabled: boolean) {
    const user = await this.adminUser(id);
    await Promise.all([
      adminAuth().updateUser(id, { disabled }),
      this.db.collection("users").doc(id).set({ active: !disabled, status: disabled ? "off-duty" : "active", updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      ...(disabled ? [adminAuth().revokeRefreshTokens(id)] : []),
    ]);
    return dataWithId<Record<string, unknown>>(id, (await this.db.collection("users").doc(user.uid).get()).data() ?? {});
  }

  async resetAdminPassword(id: string) {
    const user = await this.adminUser(id);
    if (!user.email) throw new Error("Admin email is required for password reset.");
    await adminAuth().revokeRefreshTokens(id);
    return { id, email: user.email, resetLink: await adminAuth().generatePasswordResetLink(user.email) };
  }

  private async setAdminUser(id: string, data: Record<string, unknown>) {
    const email = String(data.email || "").trim().toLowerCase();
    let authUser = id ? await adminAuth().getUser(id).catch(() => null) : null;
    if (!authUser && email) authUser = await adminAuth().getUserByEmail(email).catch(() => null);
    const created = !authUser;
    if (created && !email) throw new Error("Admin email is required.");
    if (!authUser && email) authUser = await adminAuth().createUser({
      email,
      displayName: String(data.name || data.displayName || "Platform admin"),
      password: randomBytes(18).toString("base64url"),
      disabled: data.active === false || data.status === "off-duty",
    });
    const uid = authUser?.uid || id || this.db.collection("users").doc().id;
    if (authUser) {
      await adminAuth().updateUser(uid, {
        email: email || authUser.email,
        displayName: String(data.name || data.displayName || authUser.displayName || "Platform admin"),
        disabled: data.active === false || data.status === "off-duty",
      });
    }
    const ref = this.db.collection("users").doc(uid);
    await ref.set(clean({
      ...data,
      id: uid,
      uid,
      role: data.role || "admin",
      roleId: data.roleId || "Operations",
      active: data.active !== false && data.status !== "off-duty",
      tenantId: data.tenantId || "platform",
      tenantIds: data.tenantIds || ["platform"],
      branchIds: data.branchIds || ["platform"],
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
    }), { merge: true });
    const result = dataWithId<Record<string, unknown>>(uid, (await ref.get()).data() ?? {});
    return created && authUser?.email ? { ...result, resetLink: await adminAuth().generatePasswordResetLink(authUser.email) } : result;
  }

  private async adminUser(id: string) {
    const profile = await this.db.collection("users").doc(id).get();
    if (!profile.exists || !["admin", "super_admin"].includes(String(profile.data()?.role))) throw new Error("Admin user not found.");
    return adminAuth().getUser(id);
  }
}

function clean(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function offerDocToOffer(doc: OfferDoc): Offer {
  return {
    code: doc.code,
    title: doc.title,
    subtitle: doc.subtitle,
    description: doc.description ?? doc.title,
    discount: doc.discountValue,
    minimumOrder: doc.minimumOrder ?? 0,
    channel: "Web",
    restaurantSlug: doc.restaurantId,
    discountType: doc.discountType,
    offerType: doc.offerType,
    validFrom: typeof doc.startsAt === "string" ? doc.startsAt : undefined,
    validTo: typeof doc.endsAt === "string" ? doc.endsAt : undefined,
    startTime: doc.startTime,
    endTime: doc.endTime,
    daysOfWeek: doc.daysOfWeek,
    promoTag: doc.promoTag,
    banner: doc.banner,
    mobileBanner: doc.mobileBanner,
    maxDiscount: doc.maxDiscount,
    applicableCategories: doc.applicableCategories,
    applicableItemIds: doc.applicableItemIds,
    appliesTo: doc.appliesTo ?? ["delivery", "dine-in", "takeaway"],
    newCustomersOnly: doc.newCustomersOnly,
    usageLimit: doc.usageLimit,
    perUserLimit: doc.perUserLimit,
    status: doc.status ?? (doc.active ? "active" : "inactive"),
    showOnHomepage: doc.showOnHomepage,
    showOnRestaurantPage: doc.showOnRestaurantPage,
    featured: doc.featured,
    priority: doc.priority,
    sponsored: doc.sponsored,
    sponsoredPriority: doc.sponsoredPriority,
    adBudget: doc.adBudget,
    campaignStatus: doc.campaignStatus,
    conditions: doc.conditions,
  };
}
