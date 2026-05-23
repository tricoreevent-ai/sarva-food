"use client";

import { useEffect } from "react";
import { subscribeToAuth, syncAuthSession } from "@/services/auth-service";
import { shouldUseFirebase } from "@/lib/env";

export function AuthSessionBridge() {
  useEffect(() => {
    if (!shouldUseFirebase()) return;

    return subscribeToAuth(async (user) => {
      if (!user) {
        await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
        return;
      }

      await syncAuthSession().catch(() => undefined);
    });
  }, []);

  return null;
}
