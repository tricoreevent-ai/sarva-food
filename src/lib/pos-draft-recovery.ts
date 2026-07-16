"use client";

import {
  deleteOfflineRecord,
  getOfflineRecord,
  putOfflineRecord,
} from "@/lib/offline/offline-storage";
import type { PosBill } from "@/lib/types";

const keyPrefix = "sarva-pos-draft-recovery:v1";

export type PosDraftScope = {
  restaurantId: string;
  userId: string;
};

export type PosDraftPayload = {
  bill: PosBill;
  restaurantId: string;
  deliveryAddress: string;
  landmark: string;
  orderNote: string;
};

export type PosDraftFailureKind =
  | "offline"
  | "network"
  | "permission"
  | "validation"
  | "conflict"
  | "rate-limit"
  | "provider"
  | "storage"
  | "unknown";

export type PosDraftRecoveryRecord = {
  id: string;
  payload: PosDraftPayload;
  savedAt: string;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
};

export class PosDraftSaveError extends Error {
  kind: PosDraftFailureKind;
  status?: number;
  retryable: boolean;

  constructor(message: string, kind: PosDraftFailureKind, options: { status?: number; retryable?: boolean; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "PosDraftSaveError";
    this.kind = kind;
    this.status = options.status;
    this.retryable = options.retryable ?? !["permission", "validation"].includes(kind);
  }
}

export function posDraftRecoveryId(scope: PosDraftScope) {
  return `${keyPrefix}:${safeKey(scope.restaurantId)}:${safeKey(scope.userId)}`;
}

export async function savePosDraftRecovery(
  scope: PosDraftScope,
  payload: PosDraftPayload,
  options: Pick<PosDraftRecoveryRecord, "retryCount" | "lastAttemptAt" | "lastError"> = { retryCount: 0 },
) {
  const record: PosDraftRecoveryRecord = {
    id: posDraftRecoveryId(scope),
    payload,
    savedAt: new Date().toISOString(),
    retryCount: options.retryCount,
    lastAttemptAt: options.lastAttemptAt,
    lastError: options.lastError,
  };
  let localSaved = false;
  let indexedDbSaved = false;
  let localError: unknown;
  let indexedDbError: unknown;

  try {
    window.localStorage.setItem(record.id, JSON.stringify(record));
    localSaved = true;
  } catch (error) {
    localError = error;
  }

  try {
    await putOfflineRecord("metadata", record);
    indexedDbSaved = true;
  } catch (error) {
    indexedDbError = error;
  }

  if (!localSaved && !indexedDbSaved) {
    throw storageError(localError ?? indexedDbError);
  }
  return { record, localSaved, indexedDbSaved };
}

export async function loadPosDraftRecovery(scope: PosDraftScope) {
  const id = posDraftRecoveryId(scope);
  let local: PosDraftRecoveryRecord | null = null;
  try {
    local = parseRecord(window.localStorage.getItem(id));
  } catch {
    local = null;
  }
  const indexed = await getOfflineRecord<PosDraftRecoveryRecord>("metadata", id).catch(() => null);
  const record = !local
    ? validRecord(indexed) ? indexed : null
    : !validRecord(indexed)
      ? local
      : Date.parse(indexed.savedAt) > Date.parse(local.savedAt) ? indexed : local;
  return record
    ? { ...record, payload: { ...record.payload, restaurantId: record.payload.restaurantId || scope.restaurantId } }
    : null;
}

export async function clearPosDraftRecovery(scope: PosDraftScope) {
  const id = posDraftRecoveryId(scope);
  try {
    window.localStorage.removeItem(id);
  } catch {
    // IndexedDB remains the recovery source when localStorage is unavailable.
  }
  await deleteOfflineRecord("metadata", id).catch(() => undefined);
}

export async function sendPosDraft(payload: PosDraftPayload, signal?: AbortSignal) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new PosDraftSaveError("Browser is offline.", "offline");
  }

  let response: Response;
  try {
    response = payload.bill.lines.length
      ? await fetch("/api/owner/pos", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal,
        })
      : await fetch(`/api/owner/pos?restaurantId=${encodeURIComponent(payload.restaurantId)}`, { method: "DELETE", signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new PosDraftSaveError("Network request failed.", "network", { cause: error });
  }

  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw responseError(response.status, body.error);
  return body;
}

export function posDraftFailureMessage(error: unknown) {
  const failure = normalizePosDraftError(error);
  if (failure.kind === "offline") {
    return {
      title: "Restaurant connection lost",
      message: "Orders will continue locally and retry automatically when the connection returns.",
    };
  }
  if (failure.kind === "permission") {
    return {
      title: "Draft save permission denied",
      message: "Changes are stored locally. Ask the owner to verify this operator's POS access.",
    };
  }
  if (failure.kind === "validation") {
    return {
      title: "Draft details need attention",
      message: "Changes are stored locally. Review the selected restaurant, table, customer, and items, then retry.",
    };
  }
  if (failure.kind === "storage") {
    return {
      title: "Browser storage is full",
      message: "Keep this tab open, free browser storage, and retry the draft save.",
    };
  }
  if (failure.kind === "rate-limit") {
    return {
      title: "Draft save is temporarily busy",
      message: "Changes are stored locally and will retry automatically after a short pause.",
    };
  }
  if (failure.kind === "conflict") {
    return {
      title: "Draft changed on another device",
      message: "Your latest changes are stored locally and will retry after the current save completes.",
    };
  }
  if (failure.kind === "provider") {
    return {
      title: "Restaurant database unavailable",
      message: "Changes are stored locally and will retry automatically when Firestore recovers.",
    };
  }
  return {
    title: "Unable to save draft",
    message: "Changes are stored locally and will retry automatically.",
  };
}

export function normalizePosDraftError(error: unknown) {
  if (error instanceof PosDraftSaveError) return error;
  if (isQuotaError(error)) return storageError(error);
  return new PosDraftSaveError(error instanceof Error ? error.message : "Draft save failed.", "unknown", { cause: error });
}

function responseError(status: number, reason?: string) {
  const message = reason || `Draft save failed with status ${status}.`;
  if (status === 401 || status === 403) return new PosDraftSaveError(message, "permission", { status, retryable: false });
  if (status === 400 || status === 404 || status === 422) return new PosDraftSaveError(message, "validation", { status, retryable: false });
  if (status === 409) return new PosDraftSaveError(message, "conflict", { status });
  if (status === 429) return new PosDraftSaveError(message, "rate-limit", { status });
  if (status >= 500) return new PosDraftSaveError(message, "provider", { status });
  return new PosDraftSaveError(message, "unknown", { status });
}

function storageError(cause: unknown) {
  return new PosDraftSaveError("Browser storage could not save the POS draft.", "storage", { retryable: false, cause });
}

function isQuotaError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return ["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(name) || /quota|storage.*full/i.test(message);
}

function parseRecord(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PosDraftRecoveryRecord;
    return validRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validRecord(value: unknown): value is PosDraftRecoveryRecord {
  const record = value as PosDraftRecoveryRecord | null;
  return Boolean(
    record?.id &&
    record.savedAt &&
    record.payload?.bill &&
    Array.isArray(record.payload.bill.lines),
  );
}

function safeKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
