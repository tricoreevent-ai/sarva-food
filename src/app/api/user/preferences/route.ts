import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";

const themes = new Set(["light", "dark", "system"]);

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request).catch(() => null);
  if (!session) return NextResponse.json({ preferences: {} });
  const snapshot = await adminDb().collection("user_preferences").doc(session.uid).get();
  return NextResponse.json({ preferences: snapshot.exists ? snapshot.data() : {} });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request).catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { theme?: string };
  if (!themes.has(body.theme ?? "")) return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
  await adminDb().collection("user_preferences").doc(session.uid).set({
    theme: body.theme,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return NextResponse.json({ ok: true });
}
