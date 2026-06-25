import type { NavItem, StaffRole } from "@/lib/types";
import type { UserRole } from "@/types/firebase";
import { canRolePerform, roleAllowsFeature, type AccessOperation, type OwnerFeatureKey } from "@/lib/access-control";
import { inheritedPermissions, type AppPermission } from "@/lib/rbac";

export type OperationalView = "owner" | "manager" | "cashier" | "kitchen" | "waiter" | "delivery";

type AccessUser = {
  role: UserRole;
  permissions?: string[];
  viewMode?: OperationalView;
};

const viewFeatures: Record<OperationalView, OwnerFeatureKey[]> = {
  owner: ["overview", "orders", "kitchen", "pos", "menu", "tables", "customers", "marketing", "reports", "inventory", "employees", "accounting", "settings", "integrations", "api", "auditLogs", "franchise", "aiInsights"],
  manager: ["overview", "orders", "kitchen", "pos", "menu", "tables", "customers", "marketing", "reports", "inventory", "employees", "settings", "auditLogs"],
  cashier: ["overview", "orders", "pos", "menu", "tables", "customers", "reports"],
  kitchen: ["overview", "orders", "kitchen", "menu", "inventory"],
  waiter: ["overview", "orders", "kitchen", "pos", "tables", "customers"],
  delivery: ["overview", "orders"],
};

const featurePermissions: Partial<Record<OwnerFeatureKey, Partial<Record<AccessOperation, AppPermission>>>> = {
  orders: { create: "canUsePOS", update: "canEditBill", delete: "canDeleteBill", export: "canViewReports" },
  kitchen: { read: "canUseKDS", create: "canPrintKOT", update: "canUseKDS", export: "canPrintKOT" },
  pos: { read: "canUsePOS", create: "canUsePOS", update: "canEditBill", delete: "canDeleteBill", billing: "canUsePOS" },
  menu: { create: "canEditMenu", update: "canEditMenu", delete: "canEditMenu" },
  inventory: { read: "canManageInventory", create: "canManageInventory", update: "canManageInventory", delete: "canManageInventory", export: "canViewReports" },
  reports: { read: "canViewReports", export: "canExportReports" },
  accounting: { read: "canViewAccounting", create: "canManageAccounting", update: "canManageAccounting", delete: "canManageAccounting", export: "canExportReports" },
  employees: { read: "canManageUsers", create: "canManageUsers", update: "canManageUsers", delete: "canManageUsers" },
  auditLogs: { read: "canViewAuditLogs", export: "canViewAuditLogs" },
};

export function defaultOperationalView(role: UserRole): OperationalView {
  if (role === "manager") return "manager";
  if (role === "cashier") return "cashier";
  if (role === "waiter") return "waiter";
  if (role === "chef" || role === "kitchen-manager") return "kitchen";
  if (role === "delivery" || role === "delivery-staff") return "delivery";
  return "owner";
}

export function roleForOperationalView(view: OperationalView): StaffRole {
  if (view === "kitchen") return "chef";
  if (view === "delivery") return "delivery-staff";
  return view;
}

export function canUseOperationalView(role: UserRole, view: OperationalView) {
  if (role === "owner" || role === "admin" || role === "super_admin") return true;
  return defaultOperationalView(role) === view;
}

export function canAccessOperationalFeature(user: AccessUser, feature: OwnerFeatureKey, operation: AccessOperation = "read") {
  if (user.role === "admin" || user.role === "super_admin") return true;
  const view = user.viewMode ?? defaultOperationalView(user.role);
  if (!viewFeatures[view].includes(feature)) return false;
  const effectiveRole = user.role === "owner" ? roleForOperationalView(view) : user.role;
  if (!roleAllowsFeature(effectiveRole, feature)) return false;

  const permissions = new Set([...inheritedPermissions(user.role), ...(user.permissions ?? [])]);
  const required = featurePermissions[feature]?.[operation];
  if (required && !permissions.has(required)) return false;
  return canRolePerform(effectiveRole as StaffRole, feature, operation);
}

export function filterNavigationForOperationalView(items: NavItem[], user: AccessUser) {
  return items.filter((item) => !item.featureKey || canAccessOperationalFeature(user, item.featureKey as OwnerFeatureKey, "read"));
}

export function operationalViewLabel(view: OperationalView) {
  return `${view.charAt(0).toUpperCase()}${view.slice(1)} View`;
}

export const operationalViews = Object.keys(viewFeatures) as OperationalView[];
