import { adminDb } from "@/firebase/admin";
import { getSessionFromCookies } from "@/lib/server-auth";
import { isAppTheme, normalizeTheme, THEME_COOKIE_NAME, type AppTheme } from "@/lib/theme";
import { cookies } from "next/headers";

export async function getInitialTheme(): Promise<AppTheme> {
  const cookieStore = await cookies();
  const session = await getSessionFromCookies().catch(() => null);
  if (session?.uid) {
    try {
      const snapshot = await adminDb().collection("user_preferences").doc(session.uid).get();
      const theme = snapshot.data()?.theme;
      if (isAppTheme(theme)) return theme;
    } catch {
      // Cookie/localStorage fallback keeps first paint deterministic if Admin SDK is unavailable.
    }
  }
  return normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);
}
