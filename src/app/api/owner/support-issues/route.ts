import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";
import {
  sanitizePatch,
  sortIssues,
  supportIssuePatch,
  supportIssueStatuses,
  supportIssueTargets,
  supportIssueToJson,
} from "@/lib/server/support-issues";
import type { UserRole } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ownerRoles = new Set<UserRole>(["owner", "manager", "cashier", "chef", "kitchen-manager"]);
const patchSchema = z.object({
  issueId: z.string().trim().min(1),
  status: z.enum(supportIssueStatuses).optional(),
  target: z.enum(supportIssueTargets).optional(),
  assignedTo: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });

  const ids = allowedRestaurantIds(session);
  if (!ids.length) return NextResponse.json({ data: [] });
  const snapshots = await Promise.all(ids.slice(0, 10).map((id) => adminDb().collection("supportIssues").where("restaurantId", "==", id).limit(100).get()));
  const issues = snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((doc) => supportIssueToJson(doc.id, doc.data()) as ReturnType<typeof supportIssueToJson> & { target?: string })
    .filter((issue) => issue.target !== "admin");
  return NextResponse.json({ data: sortIssues(Array.from(new Map(issues.map((issue) => [issue.id, issue])).values())) });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Issue update is invalid." }, { status: 400 });

  const ref = adminDb().collection("supportIssues").doc(parsed.data.issueId);
  const snapshot = await ref.get();
  const issue = snapshot.data() as { restaurantId?: string } | undefined;
  if (!snapshot.exists || !allowedRestaurantIds(session).includes(issue?.restaurantId ?? "")) return NextResponse.json({ error: "Issue not found." }, { status: 404 });

  await ref.set(sanitizePatch({
    ...supportIssuePatch(session, parsed.data.message, "owner"),
    status: parsed.data.status,
    target: parsed.data.target,
    assignedTo: parsed.data.assignedTo,
    resolvedAt: parsed.data.status === "resolved" || parsed.data.status === "closed" ? FieldValue.serverTimestamp() : undefined,
  }), { merge: true });
  return NextResponse.json({ ok: true });
}

function allowedRestaurantIds(session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>) {
  return Array.from(new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean)));
}
