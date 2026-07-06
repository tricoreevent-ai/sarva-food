import "server-only";

import { createHash } from "node:crypto";

export function operationKey(parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts, stableJson)).digest("base64url").slice(0, 32);
}

export function hasOperationKey(doc: unknown, key?: string) {
  if (!key || !doc || typeof doc !== "object") return false;
  const keys = (doc as { operationKeys?: unknown }).operationKeys;
  return Array.isArray(keys) && keys.includes(key);
}

function stableJson(_key: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
}
