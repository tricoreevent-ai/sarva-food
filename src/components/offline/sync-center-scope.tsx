"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import { SyncCenter } from "@/components/offline/sync-center";

const operationalRoles = new Set([
  "owner",
  "manager",
  "cashier",
  "chef",
  "kitchen-manager",
  "waiter",
  "accountant",
  "inventory-manager",
]);

function isOperationalPath(pathname: string) {
  if (pathname === "/owner/login" || pathname === "/admin/login") return false;
  return pathname === "/owner" || pathname.startsWith("/owner/") || pathname.startsWith("/pos");
}

export function SyncCenterScope() {
  const pathname = usePathname();
  const role = useAppStore((state) => state.authUser.role);

  if (!isOperationalPath(pathname) || !operationalRoles.has(role)) {
    return null;
  }

  return <SyncCenter />;
}
