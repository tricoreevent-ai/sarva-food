import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { createTableQrToken, tableQrUrl, verifyTableQrToken } from "@/lib/server/table-qr";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";
import type { RestaurantTableDoc } from "@/types/firebase";

type TableInput = {
  id?: string;
  name?: string;
  table?: string;
  tableNumber?: string;
  seats?: string | number;
  capacity?: string | number;
  status?: string;
  floor?: string;
  section?: string;
  description?: string;
  note?: string;
  active?: boolean;
  dineInEnabled?: boolean;
  qrOrderingEnabled?: boolean;
  generateQr?: boolean;
  rotateQr?: boolean;
  lastCleanedAt?: string;
};

type SessionInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceId: string;
  verifiedLocation: boolean;
  verifiedPhone: boolean;
  sessionMinutes?: number;
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
    const existing = await ref.get();
    const current = existing.data() as Record<string, unknown> | undefined;
    const qrVersion = Number(input.rotateQr ? Number(current?.qrVersion ?? 0) + 1 : current?.qrVersion ?? 1);
    const shouldGenerateQr = input.generateQr || input.rotateQr || !current?.qrToken;
    const qrToken = shouldGenerateQr
      ? createTableQrToken({ restaurantId: scope.tenantId, tableId: id, tableNumber, version: qrVersion })
      : String(current?.qrToken ?? "");
    const now = new Date();
    await ref.set({
      id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      branchId: scope.branchIds?.[0] || "main",
      name: String(input.name || input.table || tableNumber).trim(),
      tableNumber,
      table: tableNumber,
      seats: Number(input.seats ?? input.capacity ?? 4),
      capacity: Number(input.seats ?? input.capacity ?? 4),
      status: normalizeStatus(input.status),
      floor: input.floor || input.section || "Ground Floor",
      section: input.section || input.floor || "Ground Floor",
      description: input.description || "",
      note: input.note || input.description || "",
      active: input.active ?? input.status !== "Inactive",
      dineInEnabled: input.dineInEnabled ?? true,
      qrOrderingEnabled: input.qrOrderingEnabled ?? Boolean(qrToken),
      qrStatus: input.qrOrderingEnabled === false ? "disabled" : "enabled",
      qrToken,
      qrUrl: qrToken ? tableQrUrl(qrToken) : "",
      qrVersion,
      qrLastGeneratedAt: shouldGenerateQr ? now : current?.qrLastGeneratedAt ?? null,
      qrUsageCount: Number(current?.qrUsageCount ?? 0),
      currentSessionId: current?.currentSessionId ?? "",
      sessionStatus: current?.sessionStatus ?? "none",
      lastCleanedAt: input.lastCleanedAt || null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: current?.createdAt ?? FieldValue.serverTimestamp(),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async setQrStatus(scope: TenantScope, idOrTable: string, enabled: boolean) {
    const row = await this.find(scope, idOrTable);
    await this.db.collection("restaurantTables").doc(String(row.id)).set({
      qrOrderingEnabled: enabled,
      qrStatus: enabled ? "enabled" : "disabled",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(String(row.id), (await this.db.collection("restaurantTables").doc(String(row.id)).get()).data() ?? {});
  }

  async rotateQr(scope: TenantScope, idOrTable: string) {
    const row = await this.find(scope, idOrTable);
    return this.upsert(scope, {
      ...row,
      id: String(row.id),
      tableNumber: String(row.tableNumber ?? row.table),
      rotateQr: true,
      qrOrderingEnabled: true,
    });
  }

  async resolveQr(token: string) {
    const payload = verifyTableQrToken(token);
    if (!payload) return null;
    const snapshot = await this.db.collection("restaurantTables").doc(payload.tableId).get();
    if (!snapshot.exists) return null;
    const table = dataWithId<RestaurantTableDoc>(snapshot.id, snapshot.data() ?? {});
    if (
      table.restaurantId !== payload.restaurantId ||
      table.tableNumber !== payload.tableNumber ||
      table.qrToken !== token ||
      table.qrVersion !== payload.version ||
      table.qrStatus === "disabled" ||
      table.qrStatus === "revoked" ||
      table.qrOrderingEnabled === false ||
      table.active === false
    ) return null;
    return table;
  }

  async createSession(token: string, input: SessionInput) {
    const table = await this.resolveQr(token);
    if (!table) throw new Error("Invalid or disabled QR code.");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (input.sessionMinutes ?? 45) * 60_000);
    const currentExpiry = dateMs(table.sessionExpiresAt);
    const existingActive = table.currentSessionId && table.sessionStatus === "active" && currentExpiry > now.getTime();
    const sessionId = existingActive ? table.currentSessionId as string : `${table.id}-${crypto.randomUUID()}`;
    const patch = {
      currentSessionId: sessionId,
      sessionStatus: "active",
      sessionCreatedAt: existingActive ? table.sessionCreatedAt ?? now : now,
      sessionExpiresAt: expiresAt,
      lastActivity: now,
      verifiedLocation: input.verifiedLocation,
      verifiedPhone: input.verifiedPhone,
      deviceId: input.deviceId,
      qrUsageCount: FieldValue.increment(existingActive ? 0 : 1),
      sessionEvents: FieldValue.arrayUnion({
        type: existingActive ? "session_joined" : "session_created",
        at: now.toISOString(),
        message: `${input.customerName} joined ${table.tableNumber}`,
      }),
      qrLastScannedAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db.collection("restaurantTables").doc(table.id).set(patch, { merge: true });
    return { table: await this.resolveQr(token), sessionId, expiresAt: expiresAt.toISOString(), existingActive };
  }

  async touchSession(token: string, sessionId: string, event?: { type: string; message?: string }) {
    const table = await this.resolveQr(token);
    if (!table || table.currentSessionId !== sessionId || table.sessionStatus !== "active") throw new Error("Dining session is not active.");
    const now = new Date();
    if (dateMs(table.sessionExpiresAt) <= now.getTime()) {
      await this.db.collection("restaurantTables").doc(table.id).set({ sessionStatus: "expired", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      throw new Error("Dining session has expired.");
    }
    await this.db.collection("restaurantTables").doc(table.id).set({
      lastActivity: now,
      sessionExpiresAt: new Date(now.getTime() + 45 * 60_000),
      ...(event ? { sessionEvents: FieldValue.arrayUnion({ ...event, at: now.toISOString() }) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return table;
  }

  async delete(scope: TenantScope, idOrTable: string) {
    const row = await this.find(scope, idOrTable);
    await this.db.collection("restaurantTables").doc(String(row.id)).delete();
    return { id: row.id };
  }

  private async find(scope: TenantScope, idOrTable: string) {
    const rows = await this.list(scope);
    const row = rows.find((table) => table.id === idOrTable || table.table === idOrTable || table.tableNumber === idOrTable);
    if (!row?.id) throw new Error("Table not found.");
    return row;
  }
}

function normalizeStatus(value?: string) {
  if (value === "Reserved") return "reserved";
  if (value === "Cleaning") return "cleaning";
  if (value === "Inactive") return "inactive";
  if (["occupied", "preparing", "ready", "served", "completed", "billed", "reserved", "cleaning", "inactive"].includes(value ?? "")) return value;
  return "vacant";
}

function dateMs(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return Date.parse(value);
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}
