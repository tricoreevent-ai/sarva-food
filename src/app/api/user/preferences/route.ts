import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";
import { isAppTheme, normalizeTheme, THEME_COOKIE_NAME } from "@/lib/theme";

const themes = new Set(["light", "dark", "system"]);

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request).catch(() => null);
  if (!session) return NextResponse.json({ preferences: {} });
  const snapshot = await adminDb().collection("user_preferences").doc(session.uid).get();
  const response = NextResponse.json({ preferences: snapshot.exists ? snapshot.data() : {} });
  const theme = snapshot.data()?.theme;
  if (isAppTheme(theme)) {
    response.cookies.set(THEME_COOKIE_NAME, theme, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }
  return response;
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request).catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { theme?: string };
  if (!themes.has(body.theme ?? "")) return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
  const theme = normalizeTheme(body.theme);
  await adminDb().collection("user_preferences").doc(session.uid).set({
    theme,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(THEME_COOKIE_NAME, theme, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return response;
}
