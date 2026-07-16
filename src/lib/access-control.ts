import type { NavItem, Restaurant, StaffRole } from "@/lib/types";

export type PlanKey = "Trial" | "Starter" | "Growth" | "Pro" | "Enterprise";
export type AdminRoleKey = "Super Admin" | "Finance Admin" | "Support Admin" | "Operations Admin";
export type AccessOperation = "read" | "create" | "update" | "delete" | "export" | "approve" | "billing";
export type OwnerFeatureKey =
  | "overview"
  | "orders"
  | "kitchen"
  | "pos"
  | "menu"
  | "tables"
  | "customers"
  | "marketing"
  | "reports"
  | "inventory"
  | "employees"
  | "accounting"
  | "settings"
  | "integrations"
  | "api"
  | "auditLogs"
  | "franchise"
  | "aiInsights";

export type OwnerModuleDefinition = {
  key: OwnerFeatureKey;
  label: string;
  description: string;
  minimumPlan: PlanKey;
  visibleByDefault: boolean;
  ownerRoles: StaffRole[];
};

export type PlanDefinition = {
  key: PlanKey;
  label: string;
  priceLabel: string;
  monthlyPrice?: number;
  badge: string;
  description: string;
  maxBranches: number | "unlimited";
  maxEmployees: number | "unlimited";
  trialDays: number;
  modules: OwnerFeatureKey[];
  restrictions: string[];
  highlights: string[];
};

const planRank: Record<PlanKey, number> = {
  Trial: 0,
  Starter: 1,
  Growth: 2,
  Pro: 3,
  Enterprise: 4,
};

export const ownerModuleDefinitions: OwnerModuleDefinition[] = [
  { key: "overview", label: "Overview", description: "Restaurant command center and operations summary.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager"] },
  { key: "orders", label: "Orders", description: "Live online and POS order management.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager", "cashier", "waiter"] },
  { key: "kitchen", label: "Kitchen Queue", description: "Kitchen display system and production status.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager", "chef", "kitchen-manager"] },
  { key: "pos", label: "POS", description: "Touch billing, KOT printing, split payments, and live checkout.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager", "cashier", "waiter"] },
  { key: "menu", label: "Menu", description: "Menu items, categories, pricing, and availability.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager", "cashier"] },
  { key: "tables", label: "Tables", description: "Table management, dine-in orders, and floor operations.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager", "cashier", "waiter"] },
  { key: "customers", label: "Customers", description: "Customer database, loyalty, and repeat order insight.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager", "cashier"] },
  { key: "reports", label: "Reports", description: "Daily sales, menu performance, and exportable reports.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager", "accountant"] },
  { key: "inventory", label: "Inventory", description: "Stock, suppliers, purchase entries, and recipe deduction.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager", "inventory-manager"] },
  { key: "marketing", label: "Marketing", description: "Coupons, offers, campaigns, and customer messaging.", minimumPlan: "Growth", visibleByDefault: true, ownerRoles: ["owner", "manager"] },
  { key: "employees", label: "Employees", description: "Staff, roles, payroll inputs, and branch access.", minimumPlan: "Growth", visibleByDefault: true, ownerRoles: ["owner", "manager"] },
  { key: "accounting", label: "Accounting", description: "Ledger, expenses, GST, payroll reports, and cashbook.", minimumPlan: "Growth", visibleByDefault: true, ownerRoles: ["owner", "accountant"] },
  { key: "integrations", label: "Integrations", description: "Swiggy, Zomato, delivery, and external channels.", minimumPlan: "Growth", visibleByDefault: false, ownerRoles: ["owner", "manager"] },
  { key: "api", label: "API Access", description: "API keys, webhooks, and external automation.", minimumPlan: "Pro", visibleByDefault: false, ownerRoles: ["owner"] },
  { key: "auditLogs", label: "Audit Logs", description: "Sensitive changes, access history, and compliance review.", minimumPlan: "Pro", visibleByDefault: false, ownerRoles: ["owner", "manager"] },
  { key: "franchise", label: "Franchise", description: "Multi-branch and franchise group management.", minimumPlan: "Pro", visibleByDefault: false, ownerRoles: ["owner"] },
  { key: "aiInsights", label: "AI Insights", description: "Menu, sales, and operation recommendations.", minimumPlan: "Pro", visibleByDefault: false, ownerRoles: ["owner", "manager"] },
  { key: "settings", label: "Settings", description: "Restaurant profile, branding, delivery, taxes, and sync.", minimumPlan: "Starter", visibleByDefault: true, ownerRoles: ["owner", "manager"] },
];

export const planDefinitions: PlanDefinition[] = [
  {
    key: "Starter",
    label: "Starter",
    priceLabel: "₹499/mo",
    monthlyPrice: 499,
    badge: "For new restaurants",
    description: "Core POS, menu, KDS, tables, customers, and basic reports.",
    maxBranches: 1,
    maxEmployees: 5,
    trialDays: 14,
    modules: ["overview", "orders", "kitchen", "pos", "menu", "tables", "customers", "reports", "inventory", "settings"],
    restrictions: ["No Swiggy/Zomato", "No advanced accounting", "No marketing automation", "No API access"],
    highlights: ["1 branch", "Basic KDS", "GST invoice", "Email and Google login", "Basic loyalty"],
  },
  {
    key: "Growth",
    label: "Growth",
    priceLabel: "₹1499/mo",
    monthlyPrice: 1499,
    badge: "Best for active restaurants",
    description: "Advanced operations with integrations, inventory, accounting, loyalty, and exports.",
    maxBranches: 3,
    maxEmployees: 25,
    trialDays: 14,
    modules: ["overview", "orders", "kitchen", "pos", "menu", "tables", "customers", "marketing", "reports", "inventory", "employees", "accounting", "integrations", "settings"],
    restrictions: ["No API access", "No franchise analytics", "No white-label controls"],
    highlights: ["Swiggy/Zomato ready", "Advanced KDS", "Supplier management", "Coupons", "Split billing", "Multi-payment"],
  },
  {
    key: "Pro",
    label: "Pro",
    priceLabel: "₹3999/mo",
    monthlyPrice: 3999,
    badge: "For multi-branch brands",
    description: "Unlimited scale, franchise analytics, audit logs, APIs, campaigns, and AI insights.",
    maxBranches: "unlimited",
    maxEmployees: "unlimited",
    trialDays: 7,
    modules: ["overview", "orders", "kitchen", "pos", "menu", "tables", "customers", "marketing", "reports", "inventory", "employees", "accounting", "integrations", "api", "auditLogs", "franchise", "aiInsights", "settings"],
    restrictions: ["No dedicated infrastructure", "No custom SLA by default"],
    highlights: ["Unlimited branches", "API access", "Webhooks", "Audit logs", "AI insights", "White-label invoices"],
  },
  {
    key: "Enterprise",
    label: "Enterprise",
    priceLabel: "Custom",
    badge: "Custom platform",
    description: "Dedicated infrastructure, SSO, ERP/SAP/Tally integration, SLA support, and custom workflows.",
    maxBranches: "unlimited",
    maxEmployees: "unlimited",
    trialDays: 0,
    modules: ["overview", "orders", "kitchen", "pos", "menu", "tables", "customers", "marketing", "reports", "inventory", "employees", "accounting", "integrations", "api", "auditLogs", "franchise", "aiInsights", "settings"],
    restrictions: [],
    highlights: ["Dedicated infrastructure", "SSO", "ERP integrations", "Custom APIs", "Fleet management", "SLA support"],
  },
];

export const trialPlanDefinition: PlanDefinition = {
  ...planDefinitions[0],
  key: "Trial",
  label: "Trial",
  priceLabel: "Trial",
  badge: "Evaluation",
  description: "Temporary Starter access during onboarding review.",
};

export const adminRoleDefinitions: Record<AdminRoleKey, { description: string; permissions: string[] }> = {
  "Super Admin": { description: "Full platform access across billing, users, plans, restaurants, and diagnostics.", permissions: ["all"] },
  "Finance Admin": { description: "Billing, invoices, subscriptions, exports, and financial reporting.", permissions: ["restaurants:read", "subscriptions:billing", "plans:update", "reports:export"] },
  "Support Admin": { description: "Owner support, password reset, support tickets, and onboarding follow-up.", permissions: ["restaurants:read", "owners:update", "support:update", "credentials:reset"] },
  "Operations Admin": { description: "Restaurant onboarding, verification, menus, moderation, and operational approvals.", permissions: ["restaurants:create", "restaurants:update", "restaurants:approve", "features:update"] },
};

export const ownerRoleDefinitions: Record<StaffRole, { label: string; permissions: Record<OwnerFeatureKey, AccessOperation[]> }> = {
  owner: { label: "Owner", permissions: ownerPermissions(["read", "create", "update", "delete", "export", "approve", "billing"]) },
  manager: { label: "Branch Manager", permissions: ownerPermissions(["read", "create", "update", "export", "approve"]) },
  cashier: { label: "Cashier", permissions: limitedPermissions(["orders", "pos", "menu", "tables", "customers"], ["read", "create", "update"]) },
  waiter: {
    label: "Waiter",
    permissions: {
      ...limitedPermissions(["orders", "tables"], ["read", "create", "update"]),
      ...limitedPermissions(["pos"], ["read", "create"]),
    },
  },
  chef: { label: "Kitchen Staff", permissions: limitedPermissions(["kitchen", "orders"], ["read", "update"]) },
  "kitchen-manager": { label: "Kitchen Manager", permissions: limitedPermissions(["kitchen", "orders", "menu"], ["read", "update", "export"]) },
  accountant: { label: "Accountant", permissions: limitedPermissions(["accounting", "reports", "orders"], ["read", "create", "update", "export", "billing"]) },
  "inventory-manager": { label: "Inventory Manager", permissions: limitedPermissions(["inventory", "reports"], ["read", "create", "update", "export"]) },
  "delivery-staff": { label: "Delivery Staff", permissions: limitedPermissions(["orders"], ["read", "update"]) },
  delivery: { label: "Delivery", permissions: limitedPermissions(["orders"], ["read", "update"]) },
  admin: { label: "Admin", permissions: ownerPermissions(["read", "create", "update", "delete", "export", "approve", "billing"]) },
};

export function normalizePlan(plan?: Restaurant["subscriptionPlan"]): PlanKey {
  if (plan === "Professional" || plan === "Pro") return "Pro";
  if (plan === "Growth") return "Growth";
  if (plan === "Enterprise") return "Enterprise";
  if (plan === "Trial") return "Trial";
  return "Starter";
}

export function getPlanDefinition(plan?: Restaurant["subscriptionPlan"]) {
  const normalized = normalizePlan(plan);
  if (normalized === "Trial") return trialPlanDefinition;
  return planDefinitions.find((item) => item.key === normalized) ?? planDefinitions[0];
}

export function planAllowsFeature(plan: Restaurant["subscriptionPlan"] | undefined, featureKey?: string) {
  if (!featureKey) return true;
  return getPlanDefinition(plan).modules.includes(featureKey as OwnerFeatureKey);
}

export function roleAllowsFeature(role: StaffRole | "customer" | "admin" | "super_admin" | "delivery" | undefined, featureKey?: string) {
  if (!featureKey || role === "admin" || role === "super_admin") return true;
  if (!role || role === "customer" || role === "delivery") return false;
  const definition = ownerModuleDefinitions.find((item) => item.key === featureKey);
  return definition ? definition.ownerRoles.includes(role) : true;
}

export function planMeetsMinimum(plan: Restaurant["subscriptionPlan"] | undefined, minimumPlan?: Restaurant["subscriptionPlan"]) {
  if (!minimumPlan) return true;
  return planRank[normalizePlan(plan)] >= planRank[normalizePlan(minimumPlan)];
}

export function filterOwnerNavigation(items: NavItem[], plan: Restaurant["subscriptionPlan"] | undefined, role: StaffRole | "customer" | "admin" | "super_admin" | "delivery" | undefined) {
  if (role === "owner") return items;
  return items.filter((item) =>
    planAllowsFeature(plan, item.featureKey) &&
    planMeetsMinimum(plan, item.minimumPlan) &&
    roleAllowsFeature(role, item.featureKey) &&
    (!item.roles?.length || (role ? item.roles.includes(role as StaffRole) : false)),
  );
}

export function filterOwnerNavigationForRestaurant(items: NavItem[], restaurant: Restaurant | undefined, role: StaffRole | "customer" | "admin" | "super_admin" | "delivery" | undefined) {
  const allowedByPlanAndRole = filterOwnerNavigation(items, restaurant?.subscriptionPlan, role);
  if (role === "owner") return allowedByPlanAndRole;
  return allowedByPlanAndRole.filter((item) => {
    if (!item.featureKey) return true;
    if (restaurant?.hiddenOwnerNavItems?.includes(item.featureKey)) return false;
    if (restaurant?.featureAccess && restaurant.featureAccess[item.featureKey] === false) return false;
    if (restaurant?.enabledModules?.length) return restaurant.enabledModules.includes(item.featureKey);
    return true;
  });
}

export function getUpgradeRecommendations(input: {
  plan?: Restaurant["subscriptionPlan"];
  branchCount: number;
  employeeCount: number;
  requestedFeatures?: string[];
}) {
  const plan = getPlanDefinition(input.plan);
  const recommendations: string[] = [];
  if (plan.maxBranches !== "unlimited" && input.branchCount > plan.maxBranches) {
    recommendations.push(`Branch usage exceeds ${plan.label} limit. Upgrade to ${nextPlanLabel(plan.key)}.`);
  }
  if (plan.maxEmployees !== "unlimited" && input.employeeCount > plan.maxEmployees) {
    recommendations.push(`Employee usage exceeds ${plan.label} limit. Upgrade to ${nextPlanLabel(plan.key)}.`);
  }
  for (const feature of input.requestedFeatures ?? []) {
    if (!planAllowsFeature(input.plan, feature)) {
      const required = ownerModuleDefinitions.find((item) => item.key === feature)?.minimumPlan ?? "Growth";
      recommendations.push(`${labelForFeature(feature)} requires ${required} plan or above.`);
    }
  }
  return recommendations;
}

export function canRolePerform(role: StaffRole | "admin", feature: OwnerFeatureKey, operation: AccessOperation) {
  if (role === "admin") return true;
  return ownerRoleDefinitions[role]?.permissions[feature]?.includes(operation) ?? false;
}

function ownerPermissions(operations: AccessOperation[]) {
  return Object.fromEntries(ownerModuleDefinitions.map((module) => [module.key, operations])) as Record<OwnerFeatureKey, AccessOperation[]>;
}

function limitedPermissions(features: OwnerFeatureKey[], operations: AccessOperation[]) {
  return Object.fromEntries(ownerModuleDefinitions.map((module) => [module.key, features.includes(module.key) ? operations : ["read"]])) as Record<OwnerFeatureKey, AccessOperation[]>;
}

function nextPlanLabel(plan: PlanKey) {
  if (plan === "Starter" || plan === "Trial") return "Growth";
  if (plan === "Growth") return "Pro";
  return "Enterprise";
}

function labelForFeature(feature: string) {
  return ownerModuleDefinitions.find((item) => item.key === feature)?.label ?? feature;
}
