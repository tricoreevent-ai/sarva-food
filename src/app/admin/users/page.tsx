"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/client-toast";
import { KeyRound, ShieldCheck, UserPlus, UserX } from "lucide-react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";
import type { StaffMember } from "@/lib/types";

type AdminRole = "Super Admin" | "Operations" | "Support" | "Marketing" | "Finance";

const adminRolePermissions: Record<AdminRole, string[]> = {
  "Super Admin": ["all"],
  Operations: ["restaurants", "onboarding", "subscriptions", "reviews", "support"],
  Support: ["restaurants", "support", "reviews", "tickets"],
  Marketing: ["campaigns", "social", "cms", "reviews"],
  Finance: ["subscriptions", "transactions", "exports", "billing"],
};

const adminRoles = Object.keys(adminRolePermissions) as AdminRole[];

type AdminRow = StaffMember & {
  adminRole: AdminRole;
  emailLabel: string;
  permissionLabel: string;
};

export default function AdminUsersPage() {
  const { staffMembers: staff, createStaffMember, resetAdminPassword, setAdminDisabled, updateStaffMember } = useAdminRepositoryData();
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    adminRole: "Operations" as AdminRole,
  });

  const adminUsers = useMemo<AdminRow[]>(() => {
    return staff
      .filter((member) => member.role === "admin" || member.permissions.some((permission) => permission.startsWith("admin-role:")))
      .map((member) => {
        const encodedRole = member.permissions.find((permission) => permission.startsWith("admin-role:"))?.replace("admin-role:", "") as AdminRole | undefined;
        const adminRole = encodedRole && adminRoles.includes(encodedRole) ? encodedRole : member.permissions.includes("all") ? "Super Admin" : "Operations";
        return {
          ...member,
          adminRole,
          emailLabel: member.email ?? `${member.id}@foodgedi.admin`,
          permissionLabel: member.permissions.filter((permission) => !permission.startsWith("admin-role:")).join(", ") || "read",
        };
      });
  }, [staff]);

  const columns: AdvancedColumn<AdminRow>[] = [
    { key: "name", label: "Admin user", searchable: true },
    { key: "emailLabel", label: "Email", searchable: true },
    {
      key: "adminRole",
      label: "Role",
      render: (row) => (
        <select
          className="h-9 rounded-md border bg-card px-2 text-sm font-semibold"
          value={row.adminRole}
          onChange={(event) => void updateAdminRole(row, event.target.value as AdminRole)}
        >
          {adminRoles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      ),
    },
    { key: "status", label: "Status", render: (row) => <Badge variant={row.status === "active" ? "success" : "warning"}>{row.status === "active" ? "Enabled" : "Disabled"}</Badge> },
    { key: "permissionLabel", label: "Permissions" },
    { key: "lastActivity", label: "Audit log" },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex min-w-64 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void toggleAdmin(row)}>
            <UserX className="size-3" />
            {row.status === "active" ? "Disable" : "Enable"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void resetPassword(row)}>
            <KeyRound className="size-3" />
            Change password
          </Button>
        </div>
      ),
    },
  ];

  async function createAdmin() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    const result = await createStaffMember({
      name: draft.name.trim(),
      email: draft.email.trim() || undefined,
      role: "admin",
      roleId: draft.adminRole,
      status: "active",
      branchId: "platform",
      permissions: [`admin-role:${draft.adminRole}`, ...adminRolePermissions[draft.adminRole]],
    });
    const resetLink = (result as { resetLink?: string } | undefined)?.resetLink;
    if (resetLink) {
      await navigator.clipboard.writeText(resetLink);
      toast.success("Admin created. Password setup link copied.");
    }
    setDraft({ name: "", email: "", adminRole: "Operations" });
  }

  async function toggleAdmin(row: AdminRow) {
    await setAdminDisabled(row.id, row.status === "active");
    toast.success(`${row.name} ${row.status === "active" ? "disabled" : "enabled"}.`);
  }

  async function resetPassword(row: AdminRow) {
    const result = await resetAdminPassword(row.id) as { resetLink?: string } | undefined;
    if (!result?.resetLink) return toast.error("Could not create a password reset link.");
    await navigator.clipboard.writeText(result.resetLink);
    toast.success("Password reset link copied.");
  }

  async function updateAdminRole(row: AdminRow, adminRole: AdminRole) {
    await updateStaffMember({
      ...row,
      role: "admin",
      roleId: adminRole,
      permissions: [`admin-role:${adminRole}`, ...adminRolePermissions[adminRole]],
      lastActivity: `Role changed to ${adminRole}`,
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Admin User Management"
        description="Create platform admins, assign admin roles, disable access, trigger password changes, and keep audit activity visible."
        action={<Button onClick={() => void createAdmin()}><UserPlus className="size-4" />Create admin</Button>}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_220px_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-bold">
            Admin name
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Platform admin name" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Email
            <Input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="admin@foodgedi.com" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Admin role
            <select className="h-10 rounded-md border bg-card px-3" value={draft.adminRole} onChange={(event) => setDraft({ ...draft, adminRole: event.target.value as AdminRole })}>
              {adminRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <Button onClick={() => void createAdmin()} disabled={!draft.name.trim() || !draft.email.trim()}>
            <UserPlus className="size-4" />
            Save
          </Button>
        </CardContent>
      </Card>

      <AdvancedDataTable title="Platform admins" columns={columns} rows={adminUsers} pageSize={10} exportFilename="admin-users.csv" />

      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldCheck className="mt-1 size-5 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">
            Roles are stored as admin permissions in the shared access model. Firebase custom claims should mirror these role assignments during production user provisioning.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
