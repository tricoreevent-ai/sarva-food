import type { UserRole } from "@/types/firebase";

export const CUSTOMER_AUTH_STORAGE_KEY = "sarva-customer-auth";
export const CUSTOMER_ALLOWED_ROLES: UserRole[] = ["customer"];

export function isCustomerRole(role?: UserRole | null) {
  return role === "customer";
}
