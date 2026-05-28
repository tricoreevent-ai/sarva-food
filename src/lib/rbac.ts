import type { StaffRole } from "@/lib/types";
import type { UserRole } from "@/types/firebase";

export const PERMISSIONS = [
  "manage_menu",
  "manage_inventory",
  "manage_kitchen",
  "manage_billing",
  "manage_reports",
  "manage_accounting",
  "manage_users",
  "manage_offers",
  "manage_loyalty",
  "manage_roles",
  "manage_permissions",
  "manage_delivery",
  "canCreateOwner",
  "canManageTenants",
  "canManageSubscriptions",
  "canManageUsers",
  "canManageRoles",
  "canManagePermissions",
  "canForceLogout",
  "canResetPassword",
  "canViewAuditLogs",
  "canUsePOS",
  "canRefund",
  "canCancelBill",
  "canEditBill",
  "canDeleteBill",
  "canPrintBill",
  "canPrintKOT",
  "canUseKDS",
  "canEditMenu",
  "canManageInventory",
  "canViewReports",
  "canExportReports",
  "canViewAccounting",
  "canManageAccounting",
  "canManageDelivery",
  "canApproveRegistration",
] as const;

export type AppPermission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<StaffRole | UserRole, AppPermission[]> = {
  admin: ["manage_menu", "manage_inventory", "manage_kitchen", "manage_billing", "manage_reports", "manage_accounting", "manage_users", "manage_offers", "manage_loyalty", "manage_roles", "manage_permissions", "manage_delivery", "canCreateOwner", "canManageTenants", "canManageSubscriptions", "canManageUsers", "canManageRoles", "canManagePermissions", "canForceLogout", "canResetPassword", "canViewAuditLogs", "canApproveRegistration", "canViewReports", "canExportReports"],
  super_admin: ["manage_menu", "manage_inventory", "manage_kitchen", "manage_billing", "manage_reports", "manage_accounting", "manage_users", "manage_offers", "manage_loyalty", "manage_roles", "manage_permissions", "manage_delivery", "canCreateOwner", "canManageTenants", "canManageSubscriptions", "canManageUsers", "canManageRoles", "canManagePermissions", "canForceLogout", "canResetPassword", "canViewAuditLogs", "canApproveRegistration", "canViewReports", "canExportReports"],
  owner: ["manage_menu", "manage_inventory", "manage_kitchen", "manage_billing", "manage_reports", "manage_accounting", "manage_users", "manage_offers", "manage_loyalty", "manage_roles", "manage_permissions", "manage_delivery", "canManageUsers", "canManageRoles", "canManagePermissions", "canForceLogout", "canResetPassword", "canViewAuditLogs", "canUsePOS", "canRefund", "canCancelBill", "canEditBill", "canDeleteBill", "canPrintBill", "canPrintKOT", "canUseKDS", "canEditMenu", "canManageInventory", "canViewReports", "canExportReports", "canViewAccounting", "canManageAccounting", "canManageDelivery"],
  manager: ["manage_menu", "manage_inventory", "manage_kitchen", "manage_billing", "manage_reports", "manage_users", "manage_delivery", "canManageUsers", "canUsePOS", "canCancelBill", "canEditBill", "canPrintBill", "canPrintKOT", "canUseKDS", "canEditMenu", "canManageInventory", "canViewReports", "canManageDelivery"],
  cashier: ["manage_billing", "manage_reports", "canUsePOS", "canRefund", "canCancelBill", "canEditBill", "canPrintBill", "canViewReports"],
  waiter: ["manage_billing", "manage_kitchen", "canUsePOS", "canPrintKOT", "canUseKDS"],
  chef: ["manage_kitchen", "canUseKDS", "canPrintKOT"],
  "kitchen-manager": ["manage_kitchen", "manage_reports", "canUseKDS", "canPrintKOT", "canCancelBill", "canViewReports"],
  accountant: ["manage_accounting", "manage_reports", "canViewAccounting", "canManageAccounting", "canViewReports", "canExportReports"],
  "inventory-manager": ["manage_inventory", "manage_reports", "canManageInventory", "canViewReports"],
  "delivery-staff": ["manage_delivery", "canManageDelivery"],
  delivery: ["manage_delivery", "canManageDelivery"],
  customer: [],
};

export type RbacUser = {
  role?: StaffRole | UserRole;
  permissions?: string[];
  branchIds?: string[];
  status?: string;
  active?: boolean;
};

export function inheritedPermissions(role?: StaffRole | UserRole) {
  return role ? ROLE_PERMISSIONS[role] ?? [] : [];
}

export function resolveUserPermissions(user: RbacUser) {
  return Array.from(new Set([...inheritedPermissions(user.role), ...(user.permissions ?? [])]));
}

export function hasPermission(user: RbacUser, permission: AppPermission) {
  if (user.active === false || user.status === "disabled" || user.status === "locked") return false;
  return resolveUserPermissions(user).includes(permission);
}

export function canAccessBranch(user: RbacUser, branchId?: string) {
  if (!branchId) return true;
  if (user.role === "admin") return true;
  return Boolean(user.branchIds?.includes(branchId));
}

export function cloneRolePermissions(role: StaffRole | UserRole, extra: AppPermission[] = []) {
  return Array.from(new Set([...inheritedPermissions(role), ...extra]));
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Platform control for tenants, owners, subscriptions, diagnostics, and audit.",
  owner: "Restaurant control across branches, staff, POS, reports, accounting, menu, and inventory.",
  manager: "Branch operations, staff supervision, kitchen queue, inventory, reports, and delivery.",
  cashier: "Billing, POS payments, bill edits, refunds, and receipt printing.",
  waiter: "Table ordering, kitchen ticket printing, and guest service.",
  chef: "Kitchen display and ticket fulfillment.",
  "kitchen-manager": "Kitchen lanes, ticket control, and kitchen performance.",
  accountant: "Accounting entries, GST, ledger, exports, and financial reports.",
  "inventory-manager": "Inventory, purchases, suppliers, and stock controls.",
  "delivery-staff": "Delivery assignment and delivery order status.",
  delivery: "Delivery assignment and delivery order status.",
  customer: "Public customer profile, order history, loyalty, and checkout.",
};
