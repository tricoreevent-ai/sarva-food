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
  origin?: string;
  lastCleanedAt?: string;
};

type SessionInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  guestCount?: number;
  deviceId: string;
  verifiedLocation: boolean;
  verifiedPhone: boolean;
  sessionMinutes?: number;
  idleMinutes?: number;
};

type SessionEvent = {
  type: string;
  message?: string;
  deviceId?: string;
  orderId?: string;
  total?: number;
  targetTable?: string;
};

type ServiceRequestInput = {
  type: string;
  message?: string;
};

type SessionUpdateInput = {
  customerName?: string;
  customerEmail?: string;
  guestCount?: number;
  deviceId?: string;
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
    const duplicate = (await this.list(scope)).find((table) => {
      const rowNumber = String(table.tableNumber ?? table.table ?? "").trim().toUpperCase();
      return rowNumber === tableNumber && table.id !== id;
    });
    if (duplicate) throw new Error("Another table already uses this display number.");
    const ref = this.db.collection("restaurantTables").doc(id);
    const existing = await ref.get();
    const current = existing.data() as Record<string, unknown> | undefined;
    const qrVersion = Number(input.rotateQr ? Number(current?.qrVersion ?? 0) + 1 : current?.qrVersion ?? 1);
    const shouldGenerateQr = input.generateQr || input.rotateQr || (input.qrOrderingEnabled !== false && !current?.qrToken);
    const qrToken = shouldGenerateQr
      ? createTableQrToken({ restaurantId: scope.tenantId, tableId: id, tableNumber, version: qrVersion })
      : String(current?.qrToken ?? "");
    const qrPayload = verifyTableQrToken(qrToken);
    const qrExpiresAt = qrPayload?.expiresAt ? new Date(qrPayload.expiresAt) : current?.qrExpiresAt ?? null;
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
      qrUrl: qrToken ? tableQrUrl(qrToken, input.origin) : "",
      qrVersion,
      qrLastGeneratedAt: shouldGenerateQr ? now : current?.qrLastGeneratedAt ?? null,
      qrExpiresAt,
      qrUsageCount: Number(current?.qrUsageCount ?? 0),
      currentSessionId: current?.currentSessionId ?? "",
      sessionStatus: current?.sessionStatus ?? "none",
      lastCleanedAt: input.lastCleanedAt || null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: current?.createdAt ?? FieldValue.serverTimestamp(),
    }, { merge: true });
    if (shouldGenerateQr && !await this.resolveQr(qrToken)) throw new Error("QR code was saved but failed validation. Please regenerate it.");
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

  async rotateQr(scope: TenantScope, idOrTable: string, origin?: string) {
    const row = await this.find(scope, idOrTable);
    return this.upsert(scope, {
      ...row,
      id: String(row.id),
      tableNumber: String(row.tableNumber ?? row.table),
      rotateQr: true,
      qrOrderingEnabled: true,
      origin,
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
      table.active === false ||
      (payload.expiresAt ? Date.parse(payload.expiresAt) <= Date.now() : false)
    ) return null;
    return table;
  }

  async createSession(token: string, input: SessionInput) {
    const table = await this.resolveQr(token);
    if (!table) throw new Error("Invalid or disabled QR code.");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (input.sessionMinutes ?? 45) * 60_000);
    const currentExpiry = dateMs(table.sessionExpiresAt);
    const existingActive = table.currentSessionId && table.sessionStatus === "active" && currentExpiry > now.getTime() && table.deviceId === input.deviceId;
    const sessionId = existingActive ? table.currentSessionId as string : `${table.id}-${crypto.randomUUID()}`;
    const patch = {
      currentSessionId: sessionId,
      sessionStatus: "active",
      status: "occupied",
      sessionCustomerName: input.customerName,
      sessionCustomerPhone: input.customerPhone,
      sessionCustomerEmail: input.customerEmail ?? "",
      sessionGuestCount: Number(input.guestCount ?? 1),
      sessionCreatedAt: existingActive ? table.sessionCreatedAt ?? now : now,
      sessionExpiresAt: expiresAt,
      sessionTimeoutMinutes: input.sessionMinutes ?? 45,
      sessionIdleTimeoutMinutes: input.idleMinutes ?? 10,
      lastActivity: now,
      verifiedLocation: input.verifiedLocation,
      verifiedPhone: input.verifiedPhone,
      deviceId: input.deviceId,
      qrUsageCount: FieldValue.increment(existingActive ? 0 : 1),
      sessionEvents: FieldValue.arrayUnion({
        type: existingActive ? "session_joined" : "session_created",
        at: now.toISOString(),
        deviceId: input.deviceId,
        message: `${input.customerName} joined ${table.tableNumber}`,
      }),
      qrLastScannedAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db.collection("restaurantTables").doc(table.id).set(patch, { merge: true });
    return { table: await this.resolveQr(token), sessionId, expiresAt: expiresAt.toISOString(), existingActive };
  }

  async touchSession(token: string, sessionId: string, deviceId: string, event?: SessionEvent) {
    const table = await this.resolveQr(token);
    if (!table || table.currentSessionId !== sessionId || table.sessionStatus !== "active") throw new Error("Dining session is not active.");
    if (table.deviceId && table.deviceId !== deviceId) throw new Error("This dining session belongs to another device. Please scan the table QR again.");
    const now = new Date();
    if (dateMs(table.sessionExpiresAt) <= now.getTime()) {
      await this.markSessionExpired(table, "Dining session has expired.", deviceId);
      throw new Error("Dining session has expired.");
    }
    if (dateMs(table.lastActivity) + Number(table.sessionIdleTimeoutMinutes ?? 10) * 60_000 <= now.getTime()) {
      await this.markSessionExpired(table, "Dining session was idle for too long.", deviceId);
      throw new Error("Dining session was idle for too long. Please scan the table QR again.");
    }
    const orderPatch = event?.orderId ? {
      currentOrderId: event.orderId,
      activeKitchenOrderId: event.orderId,
      currentOrderTotal: Number(event.total ?? table.currentOrderTotal ?? 0),
      status: "occupied",
    } : {};
    await this.db.collection("restaurantTables").doc(table.id).set({
      lastActivity: now,
      ...orderPatch,
      ...(event ? { sessionEvents: FieldValue.arrayUnion({ ...event, deviceId, at: now.toISOString() }) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return table;
  }

  async publicSessionState(token: string, sessionId?: string, deviceId?: string) {
    const table = await this.resolveQr(token);
    if (!table) throw new Error("Invalid or disabled QR code.");
    const now = Date.now();
    const activeSession = table.currentSessionId && (!sessionId || table.currentSessionId === sessionId);
    const sameDevice = !deviceId || !table.deviceId || table.deviceId === deviceId;
    const expiresAt = dateMs(table.sessionExpiresAt);
    const idleExpiresAt = dateMs(table.lastActivity) + Number(table.sessionIdleTimeoutMinutes ?? 10) * 60_000;
    if (activeSession && table.sessionStatus === "active" && (expiresAt <= now || idleExpiresAt <= now)) {
      await this.markSessionExpired(table, expiresAt <= now ? "Dining session has expired." : "Dining session was idle for too long.", deviceId);
      return { table: await this.resolveQr(token), recoverable: true, reason: "expired" };
    }
    return {
      table,
      sessionId: sameDevice && table.sessionStatus === "active" ? table.currentSessionId ?? "" : "",
      expiresAt: table.sessionExpiresAt,
      lastActivity: table.lastActivity,
      events: Array.isArray(table.sessionEvents) ? table.sessionEvents : [],
      requests: Array.isArray(table.serviceRequests) ? table.serviceRequests : [],
      recoverable: activeSession && !sameDevice,
      reason: !sameDevice ? "device_mismatch" : table.sessionStatus ?? "none",
    };
  }

  async refreshSession(token: string, sessionId: string, deviceId: string) {
    const table = await this.touchSession(token, sessionId, deviceId, { type: "session_refreshed", message: "Session refreshed" });
    return { table: dataWithId<Record<string, unknown>>(table.id, (await this.db.collection("restaurantTables").doc(table.id).get()).data() ?? {}) };
  }

  async resumeSession(token: string, sessionId: string, deviceId: string) {
    const table = await this.touchSession(token, sessionId, deviceId, { type: "session_resumed", message: "Customer resumed session" });
    const next = dataWithId<Record<string, unknown>>(table.id, (await this.db.collection("restaurantTables").doc(table.id).get()).data() ?? {});
    return { table: next, sessionId: String(next.currentSessionId ?? ""), expiresAt: next.sessionExpiresAt };
  }

  async updateSession(token: string, sessionId: string, deviceId: string, input: SessionUpdateInput) {
    const table = input.deviceId?.trim()
      ? await this.assertRecoverableSession(token, sessionId)
      : await this.touchSession(token, sessionId, deviceId, { type: "session_updated", message: "Customer details updated" });
    const now = new Date();
    const patch = {
      ...(input.customerName?.trim() ? { sessionCustomerName: input.customerName.trim() } : {}),
      ...(typeof input.customerEmail === "string" ? { sessionCustomerEmail: input.customerEmail.trim() } : {}),
      ...(Number.isFinite(input.guestCount) ? { sessionGuestCount: Math.max(1, Math.min(20, Number(input.guestCount))) } : {}),
      ...(input.deviceId?.trim() ? { deviceId: input.deviceId.trim() } : {}),
      lastActivity: now,
      sessionEvents: FieldValue.arrayUnion({
        type: input.deviceId ? "device_replaced" : "session_customer_updated",
        at: now.toISOString(),
        deviceId: input.deviceId || deviceId,
        message: input.deviceId ? "Session device replaced" : "Customer session details updated",
      }),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db.collection("restaurantTables").doc(table.id).set(patch, { merge: true });
    return { table: dataWithId<Record<string, unknown>>(table.id, (await this.db.collection("restaurantTables").doc(table.id).get()).data() ?? {}) };
  }

  async extendPublicSession(token: string, sessionId: string, deviceId: string, minutes = 15) {
    const table = await this.touchSession(token, sessionId, deviceId, { type: "session_extend_requested", message: `Customer extended session by ${minutes} minutes` });
    const now = new Date();
    const base = Math.max(dateMs(table.sessionExpiresAt), now.getTime());
    const expiresAt = new Date(base + Math.max(1, Math.min(60, minutes)) * 60_000);
    await this.db.collection("restaurantTables").doc(table.id).set({
      sessionExpiresAt: expiresAt,
      lastActivity: now,
      sessionEvents: FieldValue.arrayUnion({ type: "session_extended", at: now.toISOString(), deviceId, message: `Extended by ${minutes} minutes` }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { table: dataWithId<Record<string, unknown>>(table.id, (await this.db.collection("restaurantTables").doc(table.id).get()).data() ?? {}), expiresAt: expiresAt.toISOString() };
  }

  async endPublicSession(token: string, sessionId: string, deviceId: string) {
    const table = await this.touchSession(token, sessionId, deviceId, { type: "session_close_requested", message: "Customer ended session" });
    const now = new Date();
    await this.db.collection("restaurantTables").doc(table.id).set({
      sessionStatus: "closed",
      status: "vacant",
      currentSessionId: "",
      currentOrderId: "",
      activeKitchenOrderId: "",
      currentOrderTotal: 0,
      billRequestedAt: null,
      lastActivity: now,
      sessionEvents: FieldValue.arrayUnion({ type: "session_closed", at: now.toISOString(), deviceId, message: "Session ended by customer" }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { table: dataWithId<Record<string, unknown>>(table.id, (await this.db.collection("restaurantTables").doc(table.id).get()).data() ?? {}) };
  }

  async serviceRequest(token: string, sessionId: string, deviceId: string, input: ServiceRequestInput) {
    const table = await this.touchSession(token, sessionId, deviceId, { type: `service_${input.type}`, message: input.message ?? input.type });
    const now = new Date();
    const request = {
      id: `REQ-${now.getTime().toString(36).toUpperCase()}`,
      type: input.type,
      status: input.type === "cancel-request" ? "cancelled" : "open",
      message: input.message ?? input.type,
      at: now.toISOString(),
    };
    const patch = {
      lastActivity: now,
      serviceRequests: FieldValue.arrayUnion(request),
      sessionEvents: FieldValue.arrayUnion({
        type: input.type === "bill" ? "bill_requested" : input.type === "cancel-request" ? "service_cancelled" : "service_requested",
        message: input.message ?? input.type,
        deviceId,
        at: now.toISOString(),
      }),
      ...(input.type === "bill" ? { status: "billed", billRequestedAt: now } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db.collection("restaurantTables").doc(table.id).set(patch, { merge: true });
    return { table: dataWithId<Record<string, unknown>>(table.id, (await this.db.collection("restaurantTables").doc(table.id).get()).data() ?? {}), request };
  }

  async extendSession(scope: TenantScope, idOrTable: string, minutes = 15) {
    const row = await this.find(scope, idOrTable);
    if (!row.currentSessionId || row.sessionStatus !== "active") throw new Error("No active QR session found for this table.");
    const now = new Date();
    const base = Math.max(dateMs(row.sessionExpiresAt), now.getTime());
    const expiresAt = new Date(base + Math.max(1, minutes) * 60_000);
    await this.db.collection("restaurantTables").doc(String(row.id)).set({
      sessionExpiresAt: expiresAt,
      lastActivity: now,
      sessionEvents: FieldValue.arrayUnion({ type: "session_extended", at: now.toISOString(), message: `Extended by ${minutes} minutes` }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(String(row.id), (await this.db.collection("restaurantTables").doc(String(row.id)).get()).data() ?? {});
  }

  async endSession(scope: TenantScope, idOrTable: string) {
    const row = await this.find(scope, idOrTable);
    const now = new Date();
    await this.db.collection("restaurantTables").doc(String(row.id)).set({
      sessionStatus: "closed",
      status: "vacant",
      currentSessionId: "",
      currentOrderId: "",
      activeKitchenOrderId: "",
      billRequestedAt: null,
      lastActivity: now,
      sessionEvents: FieldValue.arrayUnion({ type: "session_closed", at: now.toISOString(), message: "Session ended by owner" }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(String(row.id), (await this.db.collection("restaurantTables").doc(String(row.id)).get()).data() ?? {});
  }

  async transferSession(scope: TenantScope, fromIdOrTable: string, toIdOrTable: string) {
    const source = await this.find(scope, fromIdOrTable);
    const target = await this.find(scope, toIdOrTable);
    if (source.id === target.id) throw new Error("Choose a different target table.");
    if (!source.currentSessionId || source.sessionStatus !== "active") throw new Error("Source table has no active QR session.");
    if (target.currentSessionId && target.sessionStatus === "active" && dateMs(target.sessionExpiresAt) > Date.now()) throw new Error("Target table already has an active QR session.");
    const now = new Date();
    const sourceTable = String(source.tableNumber ?? source.table ?? "");
    const targetTable = String(target.tableNumber ?? target.table ?? "");
    const sessionPatch = {
      currentSessionId: source.currentSessionId,
      sessionStatus: "active",
      status: "occupied",
      sessionCustomerName: source.sessionCustomerName ?? "",
      sessionCustomerPhone: source.sessionCustomerPhone ?? "",
      sessionCustomerEmail: source.sessionCustomerEmail ?? "",
      sessionGuestCount: Number(source.sessionGuestCount ?? 1),
      sessionCreatedAt: source.sessionCreatedAt ?? now,
      sessionExpiresAt: source.sessionExpiresAt ?? new Date(now.getTime() + 45 * 60_000),
      sessionTimeoutMinutes: source.sessionTimeoutMinutes ?? 45,
      sessionIdleTimeoutMinutes: source.sessionIdleTimeoutMinutes ?? 10,
      lastActivity: now,
      verifiedLocation: source.verifiedLocation ?? false,
      verifiedPhone: source.verifiedPhone ?? false,
      deviceId: source.deviceId ?? "",
      currentOrderId: source.currentOrderId ?? source.activeKitchenOrderId ?? "",
      activeKitchenOrderId: source.activeKitchenOrderId ?? source.currentOrderId ?? "",
      currentOrderTotal: Number(source.currentOrderTotal ?? 0),
      billRequestedAt: source.billRequestedAt ?? null,
      serviceRequests: Array.isArray(source.serviceRequests) ? source.serviceRequests : [],
      sessionEvents: [
        ...(Array.isArray(source.sessionEvents) ? source.sessionEvents : []),
        { type: "session_transferred_in", at: now.toISOString(), message: `${sourceTable} transferred to ${targetTable}`, targetTable },
      ],
      updatedAt: FieldValue.serverTimestamp(),
    };
    const batch = this.db.batch();
    batch.set(this.db.collection("restaurantTables").doc(String(target.id)), sessionPatch, { merge: true });
    batch.set(this.db.collection("restaurantTables").doc(String(source.id)), {
      sessionStatus: "closed",
      status: "vacant",
      currentSessionId: "",
      currentOrderId: "",
      activeKitchenOrderId: "",
      currentOrderTotal: 0,
      billRequestedAt: null,
      lastActivity: now,
      sessionEvents: FieldValue.arrayUnion({ type: "session_transferred_out", at: now.toISOString(), message: `${sourceTable} transferred to ${targetTable}`, targetTable }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    const activeOrders = (await readTenantDocs(this.db, "kitchenOrders", scope, ["tenantId", "restaurantId"], 500))
      .filter((doc) => String(doc.data().tableNumber ?? "") === sourceTable)
      .filter((doc) => !["completed", "billed", "cancelled"].includes(String(doc.data().status ?? "")));
    activeOrders.forEach((doc) => batch.set(doc.ref, { tableNumber: targetTable, updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
    await batch.commit();
    return {
      source: dataWithId<Record<string, unknown>>(String(source.id), (await this.db.collection("restaurantTables").doc(String(source.id)).get()).data() ?? {}),
      target: dataWithId<Record<string, unknown>>(String(target.id), (await this.db.collection("restaurantTables").doc(String(target.id)).get()).data() ?? {}),
    };
  }

  async delete(scope: TenantScope, idOrTable: string) {
    const row = await this.find(scope, idOrTable);
    if (row.currentSessionId && row.sessionStatus === "active" && dateMs(row.sessionExpiresAt) > Date.now()) {
      throw new Error("This table has an active QR session. End or let the session expire before deleting it.");
    }
    const activeOrders = (await readTenantDocs(this.db, "kitchenOrders", scope, ["tenantId", "restaurantId"], 500))
      .map((doc) => doc.data())
      .filter((order) => String(order.tableNumber ?? "") === String(row.tableNumber ?? row.table ?? ""))
      .filter((order) => !["completed", "billed", "cancelled"].includes(String(order.status ?? "")));
    if (activeOrders.length) throw new Error("This table has active kitchen orders. Complete or move those orders before deleting it.");
    await this.db.collection("restaurantTables").doc(String(row.id)).delete();
    return { id: row.id };
  }

  private async find(scope: TenantScope, idOrTable: string) {
    const rows = await this.list(scope);
    const row = rows.find((table) => table.id === idOrTable || table.table === idOrTable || table.tableNumber === idOrTable);
    if (!row?.id) throw new Error("Table not found.");
    return row;
  }

  private async markSessionExpired(table: RestaurantTableDoc, message: string, deviceId?: string) {
    await this.db.collection("restaurantTables").doc(table.id).set({
      sessionStatus: "expired",
      lastActivity: new Date(),
      sessionEvents: FieldValue.arrayUnion({
        type: "session_expired",
        at: new Date().toISOString(),
        deviceId,
        message,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  private async assertRecoverableSession(token: string, sessionId: string) {
    const table = await this.resolveQr(token);
    if (!table || table.currentSessionId !== sessionId || table.sessionStatus !== "active") throw new Error("Dining session is not active.");
    const now = Date.now();
    if (dateMs(table.sessionExpiresAt) <= now || dateMs(table.lastActivity) + Number(table.sessionIdleTimeoutMinutes ?? 10) * 60_000 <= now) {
      await this.markSessionExpired(table, "Dining session has expired.");
      throw new Error("Dining session has expired.");
    }
    return table;
  }
}

function normalizeStatus(value?: string) {
  if (value === "Reserved") return "reserved";
  if (value === "Cleaning") return "cleaning";
  if (value === "Inactive") return "inactive";
  if (["occupied", "preparing", "ready", "picked-up", "served", "completed", "billed", "reserved", "cleaning", "inactive"].includes(value ?? "")) return value;
  return "vacant";
}

function dateMs(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return Date.parse(value);
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}
