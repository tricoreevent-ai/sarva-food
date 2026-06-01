import type { UserRole } from "@/types/firebase";

export const OWNER_AUTH_STORAGE_KEY = "sarva-owner-auth";
export const OWNER_ALLOWED_ROLES: UserRole[] = [
  "owner",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "kitchen-manager",
  "accountant",
  "inventory-manager",
  "delivery-staff",
  "delivery",
];

export function isOwnerRole(role?: UserRole | null) {
  return Boolean(role && OWNER_ALLOWED_ROLES.includes(role));
}
