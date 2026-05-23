"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { SimpleDataTable } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";
import type { StaffRole } from "@/lib/types";

const employeeRoleModules: Record<Exclude<StaffRole, "owner" | "admin">, string[]> = {
  manager: ["orders", "reports", "inventory", "loyalty", "employees"],
  cashier: ["pos", "billing", "receipts", "customers"],
  waiter: ["tables", "kot", "customers"],
  chef: ["kds", "orders"],
  "kitchen-manager": ["kds", "orders", "kitchen-status", "reports"],
  accountant: ["accounting", "reports", "expenses"],
  "inventory-manager": ["inventory", "purchase-orders", "suppliers"],
  "delivery-staff": ["delivery", "orders"],
  delivery: ["delivery", "orders"],
};

const roles = Object.keys(employeeRoleModules) as Array<Exclude<StaffRole, "owner" | "admin">>;

export default function OwnerEmployeesPage() {
  const branches = useAppStore((state) => state.branches);
  const staffMembers = useAppStore((state) => state.staffMembers);
  const createStaffMember = useAppStore((state) => state.createStaffMember);
  const updateStaffMember = useAppStore((state) => state.updateStaffMember);
  const apiMessage = useAppStore((state) => state.apiMessage);
  const [draft, setDraft] = useState({
    name: "",
    role: "waiter" as Exclude<StaffRole, "owner" | "admin">,
    branchId: branches[0]?.id ?? "",
  });

  const employeeRows = useMemo(
    () =>
      staffMembers
        .filter((member) => member.role !== "owner" && member.role !== "admin")
        .map((member) => ({
          id: member.id,
          name: member.name,
          role: member.role,
          branch: branches.find((branch) => branch.id === member.branchId)?.name ?? member.branchId,
          permissions: member.permissions.join(", "),
          status: member.status,
        })),
    [branches, staffMembers],
  );

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.branchId) return;
    await createStaffMember({
      name: draft.name,
      role: draft.role,
      branchId: draft.branchId,
      permissions: employeeRoleModules[draft.role],
      status: "active",
    });
    setDraft({ name: "", role: "waiter", branchId: branches[0]?.id ?? "" });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Card>
        <CardContent className="space-y-4 p-5">
          <SectionHeader
            title="Create employee"
            description="Owners can create branch-scoped employees. Owner and admin accounts stay admin-controlled."
          />
          <form className="grid gap-4" onSubmit={submitEmployee}>
            <div className="grid gap-2">
              <Label htmlFor="employee-name">Name</Label>
              <Input
                id="employee-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee-role">Role</Label>
              <select
                id="employee-role"
                className="h-10 rounded-md border bg-background px-3"
                value={draft.role}
                onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as typeof draft.role }))}
              >
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee-branch">Branch</Label>
              <select
                id="employee-branch"
                className="h-10 rounded-md border bg-background px-3"
                value={draft.branchId}
                onChange={(event) => setDraft((current) => ({ ...current, branchId: event.target.value }))}
                disabled={!branches.length}
              >
                {!branches.length ? <option value="">Create a branch first</option> : null}
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={!branches.length}>
              <UserPlus className="size-4" />
              Add employee
            </Button>
          </form>
          {apiMessage ? <p className="text-sm font-semibold text-muted-foreground">{apiMessage}</p> : null}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <SectionHeader
          title="Employees and permissions"
          description="Branch assignment and role permissions are the operational source for staff access."
          action={<Badge variant="success"><ShieldCheck className="size-3" />Tenant scoped</Badge>}
        />
        <Card>
          <CardContent className="p-0">
            <SimpleDataTable columns={["name", "role", "branch", "permissions", "status"]} rows={employeeRows} />
          </CardContent>
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          {staffMembers
            .filter((member) => member.role !== "owner" && member.role !== "admin")
            .map((member) => (
              <Card key={member.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-black">{member.name}</h2>
                    <p className="text-sm text-muted-foreground">{member.role} · {member.branchId}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={member.status === "active" ? "outline" : "default"}
                    onClick={() => updateStaffMember({
                      ...member,
                      status: member.status === "active" ? "off-duty" : "active",
                      lastActivity: member.status === "active" ? "Deactivated by owner" : "Reactivated by owner",
                    })}
                  >
                    {member.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>
    </div>
  );
}
