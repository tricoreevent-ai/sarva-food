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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  issueId: z.string().trim().min(1),
  status: z.enum(supportIssueStatuses).optional(),
  target: z.enum(supportIssueTargets).optional(),
  assignedTo: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "admin");
  if (!session || !["admin", "super_admin"].includes(session.role)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const snapshot = await adminDb().collection("supportIssues").limit(250).get();
  return NextResponse.json({ data: sortIssues(snapshot.docs.map((doc) => supportIssueToJson(doc.id, doc.data()))) });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request, "admin");
  if (!session || !["admin", "super_admin"].includes(session.role)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Issue update is invalid." }, { status: 400 });

  const ref = adminDb().collection("supportIssues").doc(parsed.data.issueId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ error: "Issue not found." }, { status: 404 });

  await ref.set(sanitizePatch({
    ...supportIssuePatch(session, parsed.data.message, "admin"),
    status: parsed.data.status,
    target: parsed.data.target,
    assignedTo: parsed.data.assignedTo,
    resolvedAt: parsed.data.status === "resolved" || parsed.data.status === "closed" ? FieldValue.serverTimestamp() : undefined,
  }), { merge: true });
  return NextResponse.json({ ok: true });
}
