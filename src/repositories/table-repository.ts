import "server-only";

import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class TableRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    const docs = await Promise.all(["tables", "restaurantTables"].map((collection) => readTenantDocs(this.db, collection, scope)));
    return Array.from(new Map(docs.flat().map((doc) => [doc.id, dataWithId<Record<string, unknown>>(doc.id, doc.data())])).values());
  }
}
