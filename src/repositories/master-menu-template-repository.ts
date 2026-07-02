import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { COLLECTIONS } from "@/firebase/collections";
import {
  keralaStarterMenuTemplates,
  normalizeMasterTemplate,
  parseTemplatePayload,
  templateToOwnerMenuDraft,
  templatesToCsv,
  validateMasterTemplate,
  type MasterTemplateInput,
  type TemplateImportFormat,
  type TemplateImportMode,
} from "@/lib/master-menu-template-normalizer";
import { dataWithId, type TenantScope } from "@/repositories/shared";

type TemplateAction = "delete" | "archive" | "restore" | "enable" | "disable" | "toggle" | "duplicate";

type ListOptions = {
  q?: string;
  categoryId?: string;
  cuisineId?: string;
  foodType?: string;
  tag?: string;
  status?: string;
  tab?: "master" | "restaurant" | "favorites" | "recent" | "popular";
  restaurantId?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
};

type ImportPayload = {
  payload?: unknown;
  templates?: MasterTemplateInput[];
  format?: TemplateImportFormat;
  mode?: TemplateImportMode;
};

export class MasterMenuTemplateRepository {
  private readonly db = adminDb();
  private readonly collection = this.db.collection(COLLECTIONS.masterMenuTemplates);

  async list(options: ListOptions = {}) {
    const limit = Math.min(Math.max(Number(options.limit ?? 24), 1), 100);
    const offset = Math.max(Number(options.offset ?? 0), 0);
    const snapshot = await this.collection.orderBy("displayOrder").limit(600).get();
    const q = String(options.q ?? "").trim().toLowerCase();
    const rows = snapshot.docs
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((item) => item.isDeleted !== true)
      .filter((item) => options.includeArchived || item.archived !== true)
      .filter((item) => matchesStatus(item, options.status))
      .filter((item) => matchesTab(item, options.tab, options.restaurantId))
      .filter((item) => !options.categoryId || item.categoryId === options.categoryId)
      .filter((item) => !options.cuisineId || includes(item.cuisineIds, options.cuisineId))
      .filter((item) => !options.foodType || item.foodType === options.foodType)
      .filter((item) => !options.tag || includes(item.tags, options.tag) || includes(item.badges, options.tag))
      .filter((item) => !q || searchableText(item).includes(q));
    return { data: rows.slice(offset, offset + limit), count: rows.length, limit, offset, offsetNext: offset + limit < rows.length ? offset + limit : null };
  }

  async export(options: ListOptions, format: TemplateImportFormat) {
    const rows = (await this.list({ ...options, limit: 100, offset: 0, includeArchived: true })).data as MasterTemplateInput[];
    if (format === "csv") return { body: templatesToCsv(rows), contentType: "text/csv; charset=utf-8", filename: "master-menu-templates.csv" };
    return { body: JSON.stringify({ templates: rows }, null, 2), contentType: "application/json; charset=utf-8", filename: "master-menu-templates.json" };
  }

  async upsert(input: MasterTemplateInput, userId: string) {
    const data = normalizeMasterTemplate(input);
    const errors = validateMasterTemplate(data);
    if (errors.length) throw new Error(errors.join(" "));
    const id = String(data.id);
    const ref = this.collection.doc(id);
    const existing = await ref.get();
    const previous = existing.data() ?? {};
    const previousVersion = Number(previous.version ?? data.version ?? 1);
    const version = existing.exists ? previousVersion + 1 : Number(data.version ?? 1);
    await ref.set(clean({
      ...data,
      id,
      version,
      updatedBy: userId,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdBy: userId, createdAt: FieldValue.serverTimestamp(), usageCount: 0, favoriteCount: 0 }),
      versionHistory: FieldValue.arrayUnion({ version, at: new Date().toISOString(), by: userId, action: existing.exists ? "updated" : "created" }),
      auditLog: FieldValue.arrayUnion({ at: new Date().toISOString(), by: userId, action: existing.exists ? "updated" : "created", version }),
      isDeleted: false,
    }), { merge: true });
    return this.get(id);
  }

  async importPayload(input: ImportPayload, userId: string) {
    const templates = input.templates?.length ? input.templates : parseTemplatePayload(input.payload, input.format ?? "json");
    return this.importMany(templates, userId, input.mode ?? "merge");
  }

  async importMany(inputs: MasterTemplateInput[], userId: string, mode: TemplateImportMode = "merge") {
    const summary = { imported: 0, updated: 0, skipped: 0, errors: [] as string[] };
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    for (const [index, input] of inputs.entries()) {
      const label = `Row ${index + 1}`;
      try {
        const data = normalizeMasterTemplate(input, index);
        const id = String(data.id);
        const nameKey = String(data.displayName).trim().toLowerCase();
        if (seenIds.has(id)) throw new Error(`${label}: duplicate id ${id}.`);
        if (seenNames.has(nameKey)) throw new Error(`${label}: duplicate name ${data.displayName}.`);
        seenIds.add(id);
        seenNames.add(nameKey);
        const errors = validateMasterTemplate(data);
        if (errors.length) throw new Error(`${label}: ${errors.join(" ")}`);
        const exists = (await this.collection.doc(id).get()).exists;
        if (exists && mode === "create-only") {
          summary.skipped += 1;
          continue;
        }
        await this.upsert(data, userId);
        if (exists) summary.updated += 1;
        else summary.imported += 1;
      } catch (error) {
        summary.errors.push(error instanceof Error ? error.message : `${label}: template import failed.`);
      }
    }
    return summary;
  }

  async seedKerala(userId: string) {
    return this.importMany(keralaStarterMenuTemplates, userId, "merge");
  }

  async action(id: string, action: TemplateAction, userId: string) {
    const ref = this.collection.doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("Template not found.");
    const current = dataWithId<Record<string, unknown>>(snapshot.id, snapshot.data() ?? {});
    if (action === "duplicate") {
      return this.upsert({
        ...current,
        id: `${id}-copy-${Date.now()}`,
        templateName: `${current.templateName}-copy`,
        displayName: `${current.displayName} Copy`,
        usageCount: 0,
        favoriteCount: 0,
      }, userId);
    }
    await ref.set(clean({
      ...(action === "delete" ? { isDeleted: true, active: false, archived: true } : {}),
      ...(action === "archive" ? { archived: true, active: false } : {}),
      ...(action === "restore" ? { archived: false, isDeleted: false, active: true } : {}),
      ...(action === "enable" ? { active: true, archived: false } : {}),
      ...(action === "disable" ? { active: false } : {}),
      ...(action === "toggle" ? { active: current.active === false, archived: false } : {}),
      updatedBy: userId,
      updatedAt: FieldValue.serverTimestamp(),
      auditLog: FieldValue.arrayUnion({ at: new Date().toISOString(), by: userId, action }),
    }), { merge: true });
    return this.get(id);
  }

  async bulkAction(ids: string[], action: Exclude<TemplateAction, "duplicate">, userId: string) {
    const data = [];
    for (const id of ids) data.push(await this.action(id, action, userId));
    return data;
  }

  async markUsed(id: string, scope: TenantScope, userId: string, mode = "wizard") {
    const ref = this.collection.doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("Template not found.");
    const template = dataWithId<Record<string, unknown>>(snapshot.id, snapshot.data() ?? {});
    await ref.set({
      usageCount: FieldValue.increment(1),
      lastUsedAt: FieldValue.serverTimestamp(),
      lastImportedAt: FieldValue.serverTimestamp(),
      lastImportedBy: userId,
      lastImportedRestaurantId: scope.tenantId,
      recentRestaurantIds: FieldValue.arrayUnion(scope.tenantId),
      usageAudit: FieldValue.arrayUnion({ at: new Date().toISOString(), restaurantId: scope.tenantId, userId, version: template.version ?? 1, mode }),
      auditLog: FieldValue.arrayUnion({ at: new Date().toISOString(), by: userId, restaurantId: scope.tenantId, action: "imported", version: template.version ?? 1 }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return templateToOwnerMenuDraft(template);
  }

  async favorite(id: string, scope: TenantScope, userId: string, enabled: boolean) {
    const ref = this.collection.doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("Template not found.");
    await ref.set({
      favoriteRestaurantIds: enabled ? FieldValue.arrayUnion(scope.tenantId) : FieldValue.arrayRemove(scope.tenantId),
      favoriteCount: FieldValue.increment(enabled ? 1 : -1),
      auditLog: FieldValue.arrayUnion({ at: new Date().toISOString(), by: userId, restaurantId: scope.tenantId, action: enabled ? "favorited" : "unfavorited" }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return this.get(id);
  }

  async savePrivateTemplate(input: MasterTemplateInput, scope: TenantScope, userId: string) {
    return this.upsert({
      ...input,
      id: String(input.id || `${scope.tenantId}-${Date.now()}`),
      scope: "restaurant",
      visibility: "private",
      restaurantId: scope.tenantId,
      ownerId: userId,
    }, userId);
  }

  private async get(id: string) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) throw new Error("Template not found.");
    return dataWithId<Record<string, unknown>>(doc.id, doc.data() ?? {});
  }
}

function matchesStatus(item: Record<string, unknown>, status?: string) {
  if (!status || status === "all") return true;
  if (status === "active") return item.active !== false && item.archived !== true;
  if (status === "disabled") return item.active === false && item.archived !== true;
  if (status === "archived") return item.archived === true;
  return true;
}

function matchesTab(item: Record<string, unknown>, tab?: ListOptions["tab"], restaurantId?: string) {
  if (!tab || tab === "master") return item.scope !== "restaurant";
  if (tab === "restaurant") return item.scope === "restaurant" && item.restaurantId === restaurantId;
  if (tab === "favorites") return includes(item.favoriteRestaurantIds, restaurantId);
  if (tab === "recent") return includes(item.recentRestaurantIds, restaurantId);
  if (tab === "popular") return Number(item.usageCount ?? 0) > 0;
  return true;
}

function searchableText(item: Record<string, unknown>) {
  return [item.displayName, item.templateName, item.categoryId, item.foodType, ...(Array.isArray(item.cuisineIds) ? item.cuisineIds : []), ...(Array.isArray(item.ingredients) ? item.ingredients : []), ...(Array.isArray(item.tags) ? item.tags : []), ...(Array.isArray(item.searchKeywords) ? item.searchKeywords : [])].join(" ").toLowerCase();
}

function includes(value: unknown, item: unknown) {
  return Boolean(item) && Array.isArray(value) && value.includes(item);
}

function clean(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
