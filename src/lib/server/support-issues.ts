import { FieldValue } from "firebase-admin/firestore";
import { parseFirestoreDateIso } from "@/lib/firestore-date";
import type { VerifiedSession } from "@/lib/server-auth";

export const supportIssueStatuses = ["open", "waiting_owner", "waiting_admin", "waiting_customer", "resolved", "closed"] as const;
export const supportIssueTargets = ["owner", "admin", "both"] as const;
export const supportIssueCategories = ["restaurant", "order", "payment", "delivery", "food_quality", "app", "other"] as const;
export const supportIssuePriorities = ["low", "normal", "high", "urgent"] as const;

export type SupportIssueStatus = (typeof supportIssueStatuses)[number];
export type SupportIssueTarget = (typeof supportIssueTargets)[number];
export type SupportIssueActor = "customer" | "owner" | "admin" | "system";

export function supportIssueToJson(id: string, data: Record<string, unknown>) {
  return {
    id,
    ...data,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    resolvedAt: toIso(data.resolvedAt),
    messages: Array.isArray(data.messages)
      ? data.messages.map((message) => ({
          ...(message as Record<string, unknown>),
          createdAt: toIso((message as Record<string, unknown>).createdAt),
        }))
      : [],
  };
}

export function newIssueMessage(input: {
  body: string;
  actor: SupportIssueActor;
  authorId?: string;
  authorName?: string;
  internal?: boolean;
}) {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    body: input.body.trim(),
    actor: input.actor,
    authorId: input.authorId ?? "",
    authorName: input.authorName?.trim() || actorLabel(input.actor),
    internal: Boolean(input.internal),
    createdAt: new Date().toISOString(),
  };
}

export function supportIssuePatch(session: VerifiedSession, message?: string, actor: "owner" | "admin" | "customer" = "owner") {
  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
  };
  if (message?.trim()) {
    patch.messages = FieldValue.arrayUnion(newIssueMessage({
      body: message,
      actor,
      authorId: session.uid,
    }));
    patch.lastMessageAt = FieldValue.serverTimestamp();
    patch.lastMessageBy = actor;
  }
  return patch;
}

export function toIso(value: unknown) {
  return parseFirestoreDateIso(value) ?? (value ? String(value) : "");
}

export function sortIssues<T extends { updatedAt?: string; createdAt?: string }>(issues: T[]) {
  return [...issues].sort((a, b) => Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || ""));
}

export function sanitizePatch(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== "")) as Record<string, unknown>;
}

function actorLabel(actor: SupportIssueActor) {
  if (actor === "admin") return "Nammude support";
  if (actor === "owner") return "Restaurant team";
  if (actor === "system") return "System";
  return "Customer";
}
