import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";

export type CommunicationSettings = {
  sms: boolean;
  whatsapp: boolean;
  smtp: boolean;
  priority: "whatsapp" | "sms" | "smtp";
  routing: "owner-and-customer" | "owner-only" | "customer-only";
  testTarget: string;
};

export type CommunicationEvent = {
  id: string;
  tenantId: string;
  restaurantId: string;
  orderId?: string;
  channel: "call" | "whatsapp" | "sms" | "smtp" | "maps" | "system";
  action: "contact" | "not-reachable" | "test";
  status: "queued" | "opened" | "failed";
  target?: string;
  customerName?: string;
  customerPhone?: string;
  message: string;
  createdAt: string;
  createdBy?: string;
};

export const defaultCommunicationSettings: CommunicationSettings = {
  sms: false,
  whatsapp: true,
  smtp: true,
  priority: "whatsapp",
  routing: "owner-and-customer",
  testTarget: "",
};

export class CommunicationRepository {
  private readonly db = adminDb();

  async get(scope: TenantScope, orderId?: string) {
    const [settings, docs] = await Promise.all([
      this.db.collection("communicationSettings").doc(scope.tenantId).get(),
      readTenantDocs(this.db, "communicationHistory", scope, ["tenantId", "restaurantId"], 200),
    ]);
    const history = docs
      .map((doc) => dataWithId<CommunicationEvent>(doc.id, doc.data()))
      .filter((event) => !orderId || event.orderId === orderId)
      .sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt))
      .slice(0, orderId ? 25 : 8);
    return {
      settings: { ...defaultCommunicationSettings, ...(settings.data() as Partial<CommunicationSettings> | undefined) },
      history,
    };
  }

  async save(scope: TenantScope, settings: CommunicationSettings) {
    const data = {
      ...defaultCommunicationSettings,
      sms: Boolean(settings.sms),
      whatsapp: Boolean(settings.whatsapp),
      smtp: Boolean(settings.smtp),
      priority: isPriority(settings.priority) ? settings.priority : defaultCommunicationSettings.priority,
      routing: isRouting(settings.routing) ? settings.routing : defaultCommunicationSettings.routing,
      testTarget: String(settings.testTarget ?? "").trim(),
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db.collection("communicationSettings").doc(scope.tenantId).set(data, { merge: true });
    return this.get(scope);
  }

  async log(scope: TenantScope, input: Omit<CommunicationEvent, "id" | "tenantId" | "restaurantId" | "createdAt" | "createdBy">) {
    const ref = this.db.collection("communicationHistory").doc();
    const createdAt = new Date().toISOString();
    const event = stripUndefined({
      ...input,
      id: ref.id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      createdAt,
      createdBy: scope.uid,
    });
    await ref.set({ ...event, firestoreCreatedAt: FieldValue.serverTimestamp() });
    if (input.orderId) {
      const patch = stripUndefined({
        communicationTimeline: FieldValue.arrayUnion(event),
        communicationLastContactAt: createdAt,
        customerNotReachable: input.action === "not-reachable" ? true : undefined,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await Promise.all([
        this.db.collection("orders").doc(input.orderId).set(patch, { merge: true }),
        this.db.collection("customerOrders").doc(input.orderId).set(patch, { merge: true }),
      ]);
    }
    return dataWithId<CommunicationEvent>(ref.id, event);
  }
}

function isPriority(value: unknown): value is CommunicationSettings["priority"] {
  return value === "whatsapp" || value === "sms" || value === "smtp";
}

function isRouting(value: unknown): value is CommunicationSettings["routing"] {
  return value === "owner-and-customer" || value === "owner-only" || value === "customer-only";
}

function stripUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value !== "undefined")) as T;
}
