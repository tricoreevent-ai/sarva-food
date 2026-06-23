import "server-only";

import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class OfferRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    return (await readTenantDocs(this.db, "offers", scope, ["tenantId", "restaurantId", "restaurantSlug"]))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((offer) => offer.isDeleted !== true)
      .sort((first, second) => Number(second.priority ?? 0) - Number(first.priority ?? 0));
  }
}
