import { ShieldCheck, UserCog, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adminRoleDefinitions, ownerModuleDefinitions, ownerRoleDefinitions, type AccessOperation } from "@/lib/access-control";
import type { StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const ownerRoles: StaffRole[] = ["owner", "manager", "cashier", "waiter", "chef", "kitchen-manager", "accountant", "inventory-manager", "delivery-staff"];
const operations: AccessOperation[] = ["read", "create", "update", "delete", "export", "approve", "billing"];

export default function AdminRolesPage() {
  return (
    <main className="min-h-screen rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
          <ShieldCheck className="size-3.5" />
          Centralized Access Control
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-normal">Roles & Access</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Admin roles, owner roles, module visibility, and operation permissions in one place.</p>
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-4">
        {Object.entries(adminRoleDefinitions).map(([role, config]) => (
          <article key={role} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700">
                <UserCog className="size-5" />
              </span>
              <Badge variant={config.permissions.includes("all") ? "success" : "secondary"}>{config.permissions.length} rules</Badge>
            </div>
            <h2 className="mt-4 text-lg font-black">{role}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{config.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {config.permissions.slice(0, 5).map((permission) => <span key={permission} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{permission}</span>)}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <span className="grid size-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black">Owner role permission matrix</h2>
            <p className="text-sm text-slate-500">Screen access, operation access, and module visibility used by owner navigation guards.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Min Plan</th>
                {ownerRoles.map((role) => <th key={role} className="px-4 py-3">{ownerRoleDefinitions[role].label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ownerModuleDefinitions.map((module) => (
                <tr key={module.key} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{module.label}</p>
                    <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{module.description}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant="secondary">{module.minimumPlan}</Badge></td>
                  {ownerRoles.map((role) => {
                    const allowed = module.ownerRoles.includes(role);
                    const permissions = ownerRoleDefinitions[role].permissions[module.key] ?? [];
                    return (
                      <td key={`${module.key}-${role}`} className="px-4 py-3">
                        <span className={cn("mb-2 inline-flex rounded-full border px-2 py-1 text-xs font-black", allowed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500")}>
                          {allowed ? "Visible" : "Hidden"}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {operations.map((operation) => (
                            <span key={operation} className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", permissions.includes(operation) ? "bg-cyan-50 text-cyan-700" : "bg-slate-50 text-slate-500")}>
                              {operation}
                            </span>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
