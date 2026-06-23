import "server-only";

import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class MenuRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    const docs = await Promise.all(["menus", "menuItems"].map((collection) => readTenantDocs(this.db, collection, scope)));
    return Array.from(new Map(docs.flat().map((doc) => [doc.id, dataWithId<Record<string, unknown>>(doc.id, doc.data())])).values())
      .filter((item) => item.isDeleted !== true)
      .sort((first, second) => Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0) || String(first.name ?? "").localeCompare(String(second.name ?? "")));
  }
}
