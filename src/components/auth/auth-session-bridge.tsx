"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeToAuth, syncAuthSession } from "@/services/auth-service";
import { shouldEnableDevLogin, shouldUseFirebase } from "@/lib/env";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import { useAppStore } from "@/lib/app-store";
import type { MockUser } from "@/lib/types";
import type { UserRole } from "@/types/firebase";

type SessionResponse = {
  ok?: boolean;
  uid?: string;
  role?: UserRole;
  tenantId?: string;
  restaurantIds?: string[];
};
type SessionSurface = "customer" | "owner" | "admin";

export function AuthSessionBridge() {
  const pathname = usePathname();
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const surface = surfaceForPath(pathname);

  useEffect(() => {
    void hydrateCookieSession(setAuthUser, surface);

    if (!shouldUseFirebase() || surface !== "customer") return;

    return subscribeToAuth(async (user) => {
      if (!user) {
        if (shouldEnableDevLogin()) return;
        await fetch("/api/auth/session?surface=customer", { method: "DELETE" }).catch(() => undefined);
        return;
      }

      await syncAuthSession("customer").catch(() => undefined);
      await hydrateCookieSession(setAuthUser, "customer");
    });
  }, [setAuthUser, surface]);

  return null;
}

async function hydrateCookieSession(setAuthUser: (user: MockUser) => void, surface: SessionSurface) {
  const response = await fetch(`/api/auth/session?surface=${surface}`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return;

  const session = (await response.json().catch(() => null)) as SessionResponse | null;
  if (!session?.ok || !session.uid || !session.role) return;

  const currentState = useAppStore.getState();
  const savedOwnerName = session.role === "owner" ? currentState.ownerBusinessProfile?.ownerName : undefined;
  const currentName = currentState.authUser.id === session.uid && currentState.authUser.name !== "Anonymous"
    ? currentState.authUser.name
    : undefined;

  setAuthUser({
    id: session.uid,
    name: savedOwnerName || currentName || displayNameForSession(session.uid, session.role),
    role: session.role,
    restaurantSlug: session.tenantId ?? session.restaurantIds?.[0] ?? DEFAULT_TENANT_ID,
  });
}

function surfaceForPath(pathname: string): SessionSurface {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/owner") || pathname.startsWith("/pos") || pathname.startsWith("/portal")) return "owner";
  return "customer";
}

function displayNameForSession(uid: string, role: UserRole) {
  if (uid === "dinucd@gmail.com" || role === "admin" || role === "super_admin") return "Platform Admin";
  if (uid === "divakdi@gmail.com" || role === "owner") return "Test Owner";
  if (role === "customer") return "Demo Customer";
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
