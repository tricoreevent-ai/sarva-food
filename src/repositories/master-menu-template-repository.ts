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
  subcategoryId?: string;
  cuisineId?: string;
  foodType?: string;
  tag?: string;
  status?: string;
  minRating?: number;
  maxPrice?: number;
  maxPrepTime?: number;
  sort?: string;
  ids?: string[];
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
      .filter((item) => !options.ids?.length || options.ids.includes(String(item.id)))
      .filter((item) => !options.categoryId || item.categoryId === options.categoryId)
      .filter((item) => !options.subcategoryId || item.subcategoryId === options.subcategoryId)
      .filter((item) => !options.cuisineId || includes(item.cuisineIds, options.cuisineId))
      .filter((item) => !options.foodType || item.foodType === options.foodType)
      .filter((item) => !options.tag || includes(item.tags, options.tag) || includes(item.badges, options.tag))
      .filter((item) => !options.minRating || Number(item.rating ?? 0) >= Number(options.minRating))
      .filter((item) => !options.maxPrice || Number(item.recommendedPrice ?? item.basePrice ?? 0) <= Number(options.maxPrice))
      .filter((item) => !options.maxPrepTime || Number(item.prepTime ?? 0) <= Number(options.maxPrepTime))
      .filter((item) => !q || searchableText(item).includes(q));
    rows.sort(sortTemplates(options.sort));
    return { data: rows.slice(offset, offset + limit), count: rows.length, limit, offset, offsetNext: offset + limit < rows.length ? offset + limit : null };
  }

  async export(options: ListOptions, format: TemplateImportFormat) {
    const rows = await this.exportRows(options);
    if (format === "csv") return { body: templatesToCsv(rows), contentType: "text/csv; charset=utf-8", filename: "master-menu-templates.csv" };
    return { body: JSON.stringify({ templates: rows }, null, 2), contentType: "application/json; charset=utf-8", filename: "master-menu-templates.json" };
  }

  async exportRows(options: ListOptions) {
    return (await this.list({ ...options, limit: 1000, offset: 0, includeArchived: true })).data as MasterTemplateInput[];
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
    const summary = { imported: 0, updated: 0, merged: 0, skipped: 0, duplicates: 0, failed: 0, errors: [] as string[] };
    const snapshot = await this.collection.orderBy("displayOrder").limit(1000).get();
    const existingByKey = new Map<string, string>();
    for (const doc of snapshot.docs) {
      const item = dataWithId<Record<string, unknown>>(doc.id, doc.data());
      if (item.isDeleted !== true) existingByKey.set(templateDuplicateKey(item), doc.id);
    }
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    for (const [index, input] of inputs.entries()) {
      const label = `Row ${index + 1}`;
      try {
        const data = normalizeMasterTemplate(input, index);
        const key = templateDuplicateKey(data);
        let id = String(data.id);
        const duplicateId = existingByKey.get(key);
        if (duplicateId && duplicateId !== id) id = duplicateId;
        if (seenIds.has(id) || seenKeys.has(key)) {
          summary.duplicates += 1;
          summary.skipped += 1;
          continue;
        }
        seenIds.add(id);
        seenKeys.add(key);
        data.id = id;
        const errors = validateMasterTemplate(data);
        if (errors.length) throw new Error(`${label}: ${errors.join(" ")}`);
        const exists = Boolean(duplicateId) || (await this.collection.doc(id).get()).exists;
        if (exists && mode === "create-only") {
          summary.skipped += 1;
          summary.duplicates += 1;
          continue;
        }
        await this.upsert(data, userId);
        if (exists) {
          summary.updated += 1;
          summary.merged += 1;
        }
        else summary.imported += 1;
      } catch (error) {
        summary.failed += 1;
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
  return [item.displayName, item.templateName, item.categoryId, item.subcategoryId, item.foodType, item.description, item.shortDescription, ...(Array.isArray(item.cuisineIds) ? item.cuisineIds : []), ...(Array.isArray(item.ingredients) ? item.ingredients : []), ...(Array.isArray(item.tags) ? item.tags : []), ...(Array.isArray(item.badges) ? item.badges : []), ...(Array.isArray(item.searchKeywords) ? item.searchKeywords : [])].join(" ").toLowerCase();
}

function sortTemplates(sort?: string) {
  return (left: Record<string, unknown>, right: Record<string, unknown>) => {
    if (sort === "popular") return Number(right.usageCount ?? 0) - Number(left.usageCount ?? 0);
    if (sort === "newest") return dateValue(right.createdAt ?? right.updatedAt) - dateValue(left.createdAt ?? left.updatedAt);
    if (sort === "rating") return Number(right.rating ?? 0) - Number(left.rating ?? 0);
    if (sort === "price") return Number(left.recommendedPrice ?? left.basePrice ?? 0) - Number(right.recommendedPrice ?? right.basePrice ?? 0);
    return Number(left.displayOrder ?? 0) - Number(right.displayOrder ?? 0);
  };
}

function templateDuplicateKey(item: Record<string, unknown>) {
  return [item.displayName, item.categoryId, Array.isArray(item.cuisineIds) ? item.cuisineIds.join("|") : "", item.foodType].map((value) => String(value ?? "").trim().toLowerCase()).join("::");
}

function dateValue(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  const time = Date.parse(String(value ?? ""));
  return Number.isFinite(time) ? time : 0;
}

function includes(value: unknown, item: unknown) {
  return Boolean(item) && Array.isArray(value) && value.includes(item);
}

function clean(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
