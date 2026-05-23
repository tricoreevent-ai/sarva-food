"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getUserProfile, subscribeToAuth } from "@/services/auth-service";
import { shouldEnableDevLogin, shouldUseFirebase } from "@/lib/env";
import { isFirebaseConfigured } from "@/firebase/client";
import { useAppStore } from "@/lib/app-store";
import type { UserDoc } from "@/types/firebase";

export type AuthMachineState = "initial" | "checking" | "authenticated" | "guest";
export type AuthProfileState = "idle" | "loading" | "success" | "error";

const AUTH_CHECK_TIMEOUT_MS = 1000;
const PROFILE_LOOKUP_TIMEOUT_MS = 800;

function canCheckFirebaseAuth() {
  try {
    return shouldUseFirebase() && isFirebaseConfigured && typeof window !== "undefined";
  } catch {
    return false;
  }
}

function timeoutAfter(ms: number, message: string) {
  return new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), ms);
  });
}

export function useAuthUser() {
  const localAuthUser = useAppStore((store) => store.authUser);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [state, setState] = useState<AuthMachineState>("initial");
  const [profileState, setProfileState] = useState<AuthProfileState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [version, setVersion] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setTimedOut(false);
    setState("initial");
    setProfileState("idle");
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    const localProfile = localAuthUser.id !== "anonymous" && shouldEnableDevLogin()
      ? createLocalProfile(localAuthUser)
      : null;

    if (!canCheckFirebaseAuth()) {
      const guestTimerId = window.setTimeout(() => {
        setUser(localProfile ? createLocalUser(localProfile) : null);
        setProfile(localProfile);
        setState(localProfile ? "authenticated" : "guest");
        setProfileState(localProfile ? "success" : "idle");
        setError(null);
      }, 0);
      return () => window.clearTimeout(guestTimerId);
    }

    let active = true;
    const checkingTimerId = window.setTimeout(() => {
      if (!active) return;
      setState("checking");
      setError(null);
      setTimedOut(false);
    }, 0);

    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      window.clearTimeout(checkingTimerId);
      setTimedOut(true);
      setUser(null);
      setProfile(null);
      setState("guest");
      setProfileState("idle");
      setError(null);
    }, AUTH_CHECK_TIMEOUT_MS);

    try {
      const unsubscribe = subscribeToAuth((nextUser) => {
        if (!active) return;
        window.clearTimeout(checkingTimerId);
        window.clearTimeout(timeoutId);
        setUser(nextUser);
        setProfile(nextUser ? null : localProfile);
        setTimedOut(false);
        setState(nextUser || localProfile ? "authenticated" : "guest");
        setProfileState(nextUser ? "loading" : localProfile ? "success" : "idle");
        setError(null);

        if (!nextUser) return;

        void Promise.race([
          getUserProfile(nextUser.uid),
          timeoutAfter(PROFILE_LOOKUP_TIMEOUT_MS, "Profile lookup timed out."),
        ])
          .then((nextProfile) => {
            if (!active) return;
            setProfile(nextProfile);
            setProfileState("success");
          })
          .catch((profileError) => {
            if (!active) return;
            setProfile(null);
            setProfileState("error");
            const message = profileError instanceof Error ? profileError.message : "";
            setError(message && !/timed out/i.test(message) ? message : null);
          });
      });

      return () => {
        active = false;
        window.clearTimeout(checkingTimerId);
        window.clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch {
      window.clearTimeout(checkingTimerId);
      window.clearTimeout(timeoutId);
      const fallbackTimerId = window.setTimeout(() => {
        if (!active) return;
        setUser(null);
        setProfile(null);
        setState("guest");
        setProfileState("idle");
        setError("Account check failed. Continuing as guest.");
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(fallbackTimerId);
      };
    }
  }, [localAuthUser, version]);

  const loading = state === "initial" || state === "checking";

  return {
    user,
    profile,
    state,
    status: state,
    profileState,
    loading,
    error,
    timedOut,
    retry,
  };
}

function createLocalUser(profile: UserDoc) {
  return {
    uid: profile.uid,
    email: profile.email ?? null,
    displayName: profile.displayName,
    photoURL: profile.photoURL ?? null,
  } as User;
}

function createLocalProfile(user: ReturnType<typeof useAppStore.getState>["authUser"]): UserDoc {
  const now = new Date();
  return {
    id: user.id,
    createdAt: now,
    updatedAt: now,
    uid: user.id,
    displayName: user.name,
    email: user.id === "demo-customer" ? "demo@sarva.test" : undefined,
    role: user.role,
    roleId: user.role,
    tenantId: user.restaurantSlug,
    tenantIds: user.restaurantSlug ? [user.restaurantSlug] : [],
    restaurantIds: user.restaurantSlug ? [user.restaurantSlug] : [],
    branchIds: [],
    permissions: user.role === "customer" ? ["customer:profile", "customer:orders"] : [],
    active: true,
  } as UserDoc;
}
