import type { UserRole } from "@/types/firebase";

export const ADMIN_AUTH_STORAGE_KEY = "sarva-admin-auth";
export const ADMIN_ALLOWED_ROLES: UserRole[] = ["admin", "super_admin"];

export function isAdminRole(role?: UserRole | null) {
  return role === "admin" || role === "super_admin";
}
