"use client";

import { KeyRound, ShieldCheck, UserPlus, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/app-store";
import type { StaffMember, StaffRole } from "@/lib/types";

const roleModules: Record<StaffRole, string[]> = {
  owner: ["all"],
  manager: ["orders", "reports", "staff", "tables"],
  cashier: ["pos", "billing", "receipts", "customers"],
  waiter: ["tables", "kot", "customers"],
  chef: ["kds", "kitchen-status"],
  "kitchen-manager": ["kds", "kitchen-status", "reports"],
  "delivery-staff": ["delivery", "order-status"],
  delivery: ["delivery", "order-status"],
  accountant: ["accounting", "reports", "exports"],
  admin: ["admin", "users", "settings"],
  "inventory-manager": ["inventory", "menu", "purchases"],
};

const roles = Object.keys(roleModules) as StaffRole[];
const creatableRoles = roles.filter((role) => role !== "owner" && role !== "admin");
const actions = ["create", "read", "update", "delete", "export", "print", "approve"];

export default function AdminUsersPage() {
  const staff = useAppStore((state) => state.staffMembers);
  const branches = useAppStore((state) => state.branches);
  const createStaffMember = useAppStore((state) => state.createStaffMember);
  const updateStaffMember = useAppStore((state) => state.updateStaffMember);
  const [draft, setDraft] = useState({
    name: "",
    role: "waiter" as StaffRole,
    branchId: branches[0]?.id ?? "",
    permissions: roleModules.waiter,
  });
  const rows = useMemo(() => staff.map((member) => ({
    ...member,
    branch: branches.find((branch) => branch.id === member.branchId)?.name ?? member.branchId,
    modules: member.permissions.join(", "),
    actionPermissions: actions.filter((action) => member.permissions.includes("all") || member.permissions.includes(action)).join(", ") || "read",
  })), [branches, staff]);
  const columns: AdvancedColumn<StaffMember & { branch: string; modules: string; actionPermissions: string }>[] = [
    { key: "name", label: "Employee" },
    { key: "role", label: "Role", render: (row) => <Badge variant="secondary">{row.role}</Badge> },
    { key: "branch", label: "Branch" },
    { key: "status", label: "Login", render: (row) => <Badge variant={row.status === "active" ? "success" : "warning"}>{row.status}</Badge> },
    { key: "modules", label: "Screen permissions" },
    { key: "actionPermissions", label: "Action permissions" },
    { key: "lastActivity", label: "Activity" },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex min-w-64 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void updateStaffMember({ ...row, status: row.status === "active" ? "off-duty" : "active", lastActivity: row.status === "active" ? "Login disabled" : "Login enabled" })}>
            <UserX className="size-3" />
            {row.status === "active" ? "Disable" : "Enable"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void updateStaffMember({ ...row, lastActivity: "Password reset link generated" })}>
            <KeyRound className="size-3" />
            Reset
          </Button>
        </div>
      ),
    },
  ];

  function updateRole(role: StaffRole) {
    setDraft((current) => ({ ...current, role, permissions: roleModules[role] }));
  }

  async function createEmployee() {
    if (!draft.name.trim() || !draft.branchId) return;
    await createStaffMember({
      name: draft.name.trim(),
      role: draft.role,
      status: "active",
      branchId: draft.branchId,
      permissions: draft.permissions,
    });
    setDraft({ name: "", role: "waiter", branchId: branches[0]?.id ?? "", permissions: roleModules.waiter });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Employee and role management"
        description="RBAC for employees with screen permissions, action permissions, branch restrictions, login disable, reset, and activity tracking."
        action={<Button onClick={() => void createEmployee()}><UserPlus className="size-4" />Create employee</Button>}
      />
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_180px_1fr_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-bold">
            Employee name
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="New employee" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Role
            <select className="h-10 rounded-md border bg-background px-3" value={draft.role} onChange={(event) => updateRole(event.target.value as StaffRole)}>
              {creatableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Branch
            <select className="h-10 rounded-md border bg-background px-3" value={draft.branchId} onChange={(event) => setDraft({ ...draft, branchId: event.target.value })} disabled={!branches.length}>
              {!branches.length ? <option value="">Create a branch first</option> : null}
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {draft.permissions.map((permission) => <Badge key={permission} variant="muted">{permission}</Badge>)}
          </div>
          <Button onClick={() => void createEmployee()} disabled={!branches.length}>
            <UserPlus className="size-4" />
            Save
          </Button>
        </CardContent>
      </Card>
      <AdvancedDataTable title="Employees and permissions" columns={columns} rows={rows} pageSize={10} exportFilename="employees-rbac.csv" />
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldCheck className="mt-1 size-5 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">
            Runtime route enforcement should check this role and permission matrix before exposing privileged screens. This page maintains the operational source of truth for branch-scoped staff access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
