"use client";

import { useCallback, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";
import { shouldEnableDevLogin } from "@/lib/env";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import { useAppStore } from "@/lib/app-store";
import { APP_NAME } from "@/lib/constants";
import type { MockUser } from "@/lib/types";
import type { UserRole } from "@/types/firebase";

type SessionResponse = {
  ok?: boolean;
  uid?: string;
  role?: UserRole;
  displayName?: string;
  email?: string;
  tenantId?: string;
  restaurantIds?: string[];
};
type SessionSurface = "customer" | "owner" | "admin";

function shouldUseFirebaseAuth() {
  return process.env.NEXT_PUBLIC_USE_FIREBASE === "true";
}

function isStackAuthEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID?.trim() &&
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY?.trim(),
  );
}

function loadFirebaseAuthService() {
  return import("@/services/auth-service");
}

function loadStackAuthService() {
  return import("@/services/auth/stack-auth-client");
}

export function AuthSessionBridge() {
  const pathname = usePathname();
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const [, startTransition] = useTransition();
  const setScopedAuthUser = useCallback((user: MockUser) => {
    startTransition(() => setAuthUser(user));
  }, [setAuthUser, startTransition]);
  const surface = surfaceForPath(pathname);

  useEffect(() => {
    void hydrateCookieSession(setScopedAuthUser, surface);

    if (!shouldUseFirebaseAuth() || surface !== "customer") return;

    let active = true;
    let unsubscribe: (() => void) | undefined;
    void loadFirebaseAuthService()
      .then(({ subscribeToAuth, syncAuthSession }) => {
        if (!active) return;
        unsubscribe = subscribeToAuth(async (user) => {
          if (!user) {
            if (isStackAuthEnabled()) {
              const { getStackCustomer } = await loadStackAuthService();
              const stackUser = await getStackCustomer().catch(() => null);
              if (stackUser?.id) {
                setScopedAuthUser({
                  id: stackUser.id,
                  name: stackUser.displayName || stackUser.primaryEmail || `${APP_NAME} Customer`,
                  role: "customer",
                  restaurantSlug: DEFAULT_TENANT_ID,
                });
                return;
              }
            }
            if (shouldEnableDevLogin()) return;
            await fetch("/api/auth/session?surface=customer", { method: "DELETE" }).catch(() => undefined);
            setScopedAuthUser(anonymousCustomer());
            return;
          }

          await syncAuthSession("customer", { ensureCustomer: true }).catch(() => undefined);
          await hydrateCookieSession(setScopedAuthUser, "customer");
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [setScopedAuthUser, surface]);

  return null;
}

function anonymousCustomer(): MockUser {
  return { id: "anonymous", name: "Anonymous", role: "customer", restaurantSlug: DEFAULT_TENANT_ID };
}

async function hydrateCookieSession(setAuthUser: (user: MockUser) => void, surface: SessionSurface) {
  const response = await fetch(`/api/auth/session?surface=${surface}`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return;

  const session = (await response.json().catch(() => null)) as SessionResponse | null;
  if (!session?.ok || !session.uid || !session.role) return;

  const currentState = useAppStore.getState();
  const savedOwnerName = session.role === "owner" ? ownerProfileDisplayName(currentState.ownerBusinessProfile) : undefined;
  const currentName = currentState.authUser.id === session.uid && currentState.authUser.name !== "Anonymous" && !isMachineDisplayName(currentState.authUser.name)
    ? currentState.authUser.name
    : undefined;
  const sessionName = session.displayName?.trim() || session.email?.trim();

  setAuthUser({
    id: session.uid,
    name: sessionName || savedOwnerName || currentName || displayNameForSession(session.uid, session.role),
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
  if (uid === "divakdi@gmail.com") return "divakdi@gmail.com";
  if (role === "owner") return "Owner";
  if (role === "customer") return "Customer";
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ownerProfileDisplayName(profile: ReturnType<typeof useAppStore.getState>["ownerBusinessProfile"]) {
  const ownerName = profile?.ownerName?.trim();
  if (ownerName && !isMachineDisplayName(ownerName)) return ownerName;
  return profile?.hotelName?.trim() || undefined;
}

function isMachineDisplayName(value?: string) {
  const text = value?.trim() ?? "";
  return Boolean(text && !text.includes("@") && !text.includes(" ") && /^[A-Za-z0-9_-]{20,}$/.test(text));
}
