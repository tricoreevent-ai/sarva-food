import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { defaultBillTemplate, defaultKotTemplate } from "@/lib/print-engine";
import { DEFAULT_BRANCH_ID } from "@/lib/tenant";
import type { PrinterSettings, PrintLog, PrinterProfile, PrintTemplate } from "@/lib/types";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";

const defaults: PrinterSettings = {
  kitchenPrinterName: "",
  billingPrinterName: "",
  autoPrintOrders: false,
  compactTickets: true,
  connectionStatus: "browser-preview",
  escPosReady: false,
  profiles: [
    { id: "browser-kitchen", name: "Kitchen browser preview", type: "kitchen", branchId: DEFAULT_BRANCH_ID, paperWidth: "80mm", connection: "browser", status: "online" },
    { id: "browser-billing", name: "Billing browser preview", type: "billing", branchId: DEFAULT_BRANCH_ID, paperWidth: "80mm", connection: "browser", status: "online" },
  ],
  templates: [defaultBillTemplate, defaultKotTemplate],
  printLogs: [],
};

export class PrinterRepository {
  private readonly db = adminDb();

  async get(scope: TenantScope) {
    const [settings, profiles, templates, logs] = await Promise.all([
      this.db.collection("printerSettings").doc(scope.tenantId).get(),
      readTenantDocs(this.db, "printerProfiles", scope),
      readTenantDocs(this.db, "printTemplates", scope),
      readTenantDocs(this.db, "printLogs", scope, ["tenantId", "restaurantId"], 100),
    ]);
    return {
      ...defaults,
      ...(settings.data() as Partial<PrinterSettings> | undefined),
      profiles: dedupeById([...defaults.profiles ?? [], ...profiles.map((doc) => dataWithId<PrinterProfile>(doc.id, doc.data()))]),
      templates: dedupeById([...defaults.templates ?? [], ...templates.map((doc) => dataWithId<PrintTemplate>(doc.id, doc.data()))]),
      printLogs: logs.map((doc) => dataWithId<PrintLog>(doc.id, doc.data())).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    };
  }

  async context(scope: TenantScope) {
    const [profiles, branches, taxSettings, orders] = await Promise.all([
      readTenantDocs(this.db, "ownerProfiles", scope),
      readTenantDocs(this.db, "branches", scope),
      readTenantDocs(this.db, "taxSettings", scope),
      readTenantDocs(this.db, "kitchenOrders", scope, ["tenantId", "restaurantId"], 100),
    ]);
    const latestOrder = orders
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt))[0];
    return {
      profile: profiles[0] ? dataWithId<Record<string, unknown>>(profiles[0].id, profiles[0].data()) : null,
      branch: branches[0] ? dataWithId<Record<string, unknown>>(branches[0].id, branches[0].data()) : null,
      taxSettings: taxSettings[0] ? dataWithId<Record<string, unknown>>(taxSettings[0].id, taxSettings[0].data()) : null,
      latestOrder: latestOrder ?? null,
    };
  }

  async save(scope: TenantScope, settings: PrinterSettings) {
    const [storedProfiles, storedTemplates] = await Promise.all([
      readTenantDocs(this.db, "printerProfiles", scope),
      readTenantDocs(this.db, "printTemplates", scope),
    ]);
    const batch = this.db.batch();
    batch.set(this.db.collection("printerSettings").doc(scope.tenantId), {
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      kitchenPrinterName: settings.kitchenPrinterName,
      billingPrinterName: settings.billingPrinterName,
      autoPrintOrders: settings.autoPrintOrders,
      compactTickets: settings.compactTickets,
      connectionStatus: settings.connectionStatus,
      escPosReady: settings.escPosReady ?? false,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    const profileRefs = new Set((settings.profiles ?? []).map((profile) => scopedId(scope.tenantId, profile.id)));
    const templateRefs = new Set((settings.templates ?? []).map((template) => scopedId(scope.tenantId, template.id)));
    for (const doc of storedProfiles) if (!profileRefs.has(doc.id)) batch.delete(doc.ref);
    for (const doc of storedTemplates) if (!templateRefs.has(doc.id)) batch.delete(doc.ref);
    for (const profile of settings.profiles ?? []) {
      batch.set(this.db.collection("printerProfiles").doc(scopedId(scope.tenantId, profile.id)), { ...profile, tenantId: scope.tenantId, restaurantId: scope.tenantId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    for (const template of settings.templates ?? []) {
      batch.set(this.db.collection("printTemplates").doc(scopedId(scope.tenantId, template.id)), { ...template, tenantId: scope.tenantId, restaurantId: scope.tenantId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    await batch.commit();
    return this.get(scope);
  }

  async log(scope: TenantScope, input: Omit<PrintLog, "id" | "timestamp">) {
    const ref = this.db.collection("printLogs").doc();
    const timestamp = new Date().toISOString();
    await ref.set({ ...input, id: ref.id, tenantId: scope.tenantId, restaurantId: scope.tenantId, timestamp, createdAt: FieldValue.serverTimestamp() });
    return { ...input, id: ref.id, timestamp };
  }
}

function scopedId(tenantId: string, id: string) {
  return `${tenantId}--${id}`;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
