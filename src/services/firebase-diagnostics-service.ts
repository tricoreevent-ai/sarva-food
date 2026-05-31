"use client";

import type { FirebaseDiagnostics } from "@/types/firebase-diagnostics";

export async function runFirebaseDiagnostics(options: { scope?: "startup" | "full" } = {}): Promise<FirebaseDiagnostics> {
  const query = options.scope ? `?scope=${encodeURIComponent(options.scope)}` : "";
  const response = await fetch(`/api/admin/firebase-diagnostics${query}`, {
    cache: "no-store",
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: FirebaseDiagnostics;
    error?: string;
  };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "Firebase diagnostics failed.");
  }

  return payload.data;
}

export type {
  FirebaseDiagnosticItem,
  FirebaseDiagnostics,
  FirebaseDiagnosticStatus,
} from "@/types/firebase-diagnostics";
