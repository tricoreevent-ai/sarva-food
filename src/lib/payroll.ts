import { cloneRolePermissions, ROLE_DESCRIPTIONS, type AppPermission } from "@/lib/rbac";
import type { StaffRole } from "@/lib/types";

export type PayrollEmploymentType = "fixed" | "contract";
export type PayrollTdsSection = "salary" | "194C" | "194J";

export type PayrollInput = {
  employmentType: PayrollEmploymentType;
  monthlySalary: number;
  contractRate: number;
  professionalTaxState: string;
  tdsSection: PayrollTdsSection;
  pfEnabled: boolean;
  esiEnabled: boolean;
};

export type PayrollEstimate = {
  grossMonthly: number;
  estimatedAnnualIncome: number;
  tdsMonthly: number;
  professionalTaxMonthly: number;
  pfEmployee: number;
  esiEmployee: number;
  netMonthly: number;
};

export const OWNER_EMPLOYEE_ROLES: Array<Exclude<StaffRole, "owner" | "admin">> = [
  "manager",
  "accountant",
  "waiter",
  "chef",
  "cashier",
  "kitchen-manager",
  "inventory-manager",
  "delivery-staff",
];

export const ROLE_LOGIN_REQUIREMENT: Record<Exclude<StaffRole, "owner" | "admin">, boolean> = {
  manager: true,
  accountant: true,
  waiter: true,
  chef: false,
  cashier: true,
  "kitchen-manager": true,
  "inventory-manager": true,
  "delivery-staff": true,
  delivery: true,
};

export const ROLE_ACCESS_LABELS: Record<Exclude<StaffRole, "owner" | "admin">, string> = {
  manager: "Kitchen Queue, Menu, Tables, Inventory, Employees, Reports",
  accountant: "Accounting, Reports, Inventory costs",
  waiter: "Tables, POS, Kitchen tickets, Customers",
  chef: "Kitchen Queue and limited inventory alerts",
  cashier: "POS billing, receipts, customers, daily cash",
  "kitchen-manager": "Kitchen Queue, ticket control, kitchen reports",
  "inventory-manager": "Inventory, purchasing, suppliers, reports",
  "delivery-staff": "Delivery assignment and status updates",
  delivery: "Delivery assignment and status updates",
};

export function permissionsForEmployeeRole(role: Exclude<StaffRole, "owner" | "admin">): AppPermission[] {
  return cloneRolePermissions(role);
}

export function roleDescription(role: StaffRole) {
  return ROLE_DESCRIPTIONS[role] ?? "Restaurant staff role.";
}

export function calculatePayrollEstimate(input: PayrollInput): PayrollEstimate {
  const grossMonthly = input.employmentType === "fixed" ? input.monthlySalary : input.contractRate;
  const estimatedAnnualIncome = grossMonthly * 12;
  const tdsMonthly = Math.round(calculateTds(input, estimatedAnnualIncome) / 12);
  const professionalTaxMonthly = calculateProfessionalTax(input.professionalTaxState, grossMonthly);
  const pfEmployee = input.pfEnabled ? Math.round(grossMonthly * 0.12) : 0;
  const esiEmployee = input.esiEnabled && grossMonthly <= 21_000 ? Math.round(grossMonthly * 0.0075) : 0;
  const netMonthly = Math.max(0, grossMonthly - tdsMonthly - professionalTaxMonthly - pfEmployee - esiEmployee);

  return {
    grossMonthly,
    estimatedAnnualIncome,
    tdsMonthly,
    professionalTaxMonthly,
    pfEmployee,
    esiEmployee,
    netMonthly,
  };
}

function calculateTds(input: PayrollInput, annualIncome: number) {
  if (annualIncome <= 0) return 0;
  if (input.employmentType === "contract") {
    if (annualIncome < 100_000) return 0;
    return Math.round(annualIncome * (input.tdsSection === "194J" ? 0.1 : 0.01));
  }

  const taxable = Math.max(0, annualIncome - 300_000);
  if (!taxable) return 0;
  if (annualIncome <= 700_000) return Math.round(taxable * 0.05);
  if (annualIncome <= 1_000_000) return Math.round(20_000 + (annualIncome - 700_000) * 0.1);
  if (annualIncome <= 1_200_000) return Math.round(50_000 + (annualIncome - 1_000_000) * 0.15);
  if (annualIncome <= 1_500_000) return Math.round(80_000 + (annualIncome - 1_200_000) * 0.2);
  return Math.round(140_000 + (annualIncome - 1_500_000) * 0.3);
}

function calculateProfessionalTax(state: string, grossMonthly: number) {
  const normalized = state.trim().toLowerCase();
  if (!grossMonthly) return 0;
  if (normalized.includes("maharashtra")) return grossMonthly > 10_000 ? 200 : 0;
  if (normalized.includes("karnataka")) return grossMonthly >= 25_000 ? 200 : 0;
  if (normalized.includes("kerala")) return grossMonthly >= 20_000 ? 208 : grossMonthly >= 12_000 ? 125 : 0;
  return grossMonthly >= 25_000 ? 200 : 0;
}
