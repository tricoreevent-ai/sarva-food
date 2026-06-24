import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

type TableInput = {
  id?: string;
  table?: string;
  tableNumber?: string;
  seats?: string | number;
  capacity?: string | number;
  status?: string;
  floor?: string;
  section?: string;
  qrCode?: string;
  note?: string;
  lastCleanedAt?: string;
};

export class TableRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    const docs = await Promise.all(["tables", "restaurantTables"].map((collection) => readTenantDocs(this.db, collection, scope)));
    return Array.from(new Map(docs.flat().map((doc) => [doc.id, dataWithId<Record<string, unknown>>(doc.id, doc.data())])).values())
      .filter((table) => table.isDeleted !== true)
      .sort((first, second) => String(first.tableNumber ?? first.table ?? "").localeCompare(String(second.tableNumber ?? second.table ?? ""), undefined, { numeric: true }));
  }

  async upsert(scope: TenantScope, input: TableInput) {
    const tableNumber = String(input.tableNumber || input.table || "").trim().toUpperCase();
    if (!tableNumber) throw new Error("Table number is required.");
    const id = input.id || `${scope.tenantId}-${tableNumber.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    const ref = this.db.collection("restaurantTables").doc(id);
    await ref.set({
      id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      branchId: scope.branchIds?.[0] || "main",
      tableNumber,
      table: tableNumber,
      seats: Number(input.seats ?? input.capacity ?? 4),
      capacity: Number(input.seats ?? input.capacity ?? 4),
      status: input.status || "Open",
      floor: input.floor || input.section || "Ground Floor",
      section: input.section || input.floor || "Ground Floor",
      qrCode: input.qrCode || `/table/${scope.tenantId}/${tableNumber}`,
      note: input.note || "",
      lastCleanedAt: input.lastCleanedAt || null,
      active: input.status !== "Inactive",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async delete(scope: TenantScope, idOrTable: string) {
    const rows = await this.list(scope);
    const row = rows.find((table) => table.id === idOrTable || table.table === idOrTable || table.tableNumber === idOrTable);
    if (!row?.id) throw new Error("Table not found.");
    await this.db.collection("restaurantTables").doc(String(row.id)).delete();
    return { id: row.id };
  }
}
