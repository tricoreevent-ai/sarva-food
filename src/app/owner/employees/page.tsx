"use client";

import { useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Calculator, CheckCircle2, Edit3, KeyRound, Trash2, UserPlus, type LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculatePayrollEstimate,
  OWNER_EMPLOYEE_ROLES,
  permissionsForEmployeeRole,
  ROLE_ACCESS_LABELS,
  ROLE_LOGIN_REQUIREMENT,
  roleDescription,
  type PayrollEmploymentType,
  type PayrollTdsSection,
} from "@/lib/payroll";
import { useAppStore } from "@/lib/app-store";
import type { StaffMember, StaffRole } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type EmployeeRole = Exclude<StaffRole, "owner" | "admin">;
type WizardStep = 0 | 1 | 2 | 3;

type EmployeeDraft = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  branchId: string;
  permissions: string[];
  employmentType: PayrollEmploymentType;
  monthlySalary: string;
  contractRate: string;
  professionalTaxState: string;
  tdsSection: PayrollTdsSection;
  panNumber: string;
  pfNumber: string;
  esiNumber: string;
  pfEnabled: boolean;
  esiEnabled: boolean;
};

export default function OwnerEmployeesPage() {
  const branches = useAppStore((state) => state.branches);
  const staffMembers = useAppStore((state) => state.staffMembers);
  const createStaffMember = useAppStore((state) => state.createStaffMember);
  const updateStaffMember = useAppStore((state) => state.updateStaffMember);
  const deleteStaffMember = useAppStore((state) => state.deleteStaffMember);
  const [step, setStep] = useState<WizardStep>(0);
  const [draft, setDraft] = useState<EmployeeDraft>(() => emptyDraft(branches[0]?.id ?? ""));

  const estimate = useMemo(
    () => calculatePayrollEstimate({
      employmentType: draft.employmentType,
      monthlySalary: Number(draft.monthlySalary) || 0,
      contractRate: Number(draft.contractRate) || 0,
      professionalTaxState: draft.professionalTaxState,
      tdsSection: draft.tdsSection,
      pfEnabled: draft.pfEnabled,
      esiEnabled: draft.esiEnabled,
    }),
    [draft.contractRate, draft.employmentType, draft.esiEnabled, draft.monthlySalary, draft.pfEnabled, draft.professionalTaxState, draft.tdsSection],
  );

  const employeeRows = useMemo(
    () =>
      staffMembers
        .filter((member) => member.role !== "owner" && member.role !== "admin")
        .map((member) => ({
          ...member,
          branch: branches.find((branch) => branch.id === member.branchId)?.name ?? member.branchId,
          login: member.requiresLogin === false ? "Payroll only" : member.email ? "Login enabled" : "Needs email",
          gross: member.payrollEstimate?.grossMonthly ?? member.monthlySalary ?? member.contractRate ?? 0,
          net: member.payrollEstimate?.netMonthly ?? 0,
        })),
    [branches, staffMembers],
  );

  const columns: AdvancedColumn<(typeof employeeRows)[number]>[] = [
    { key: "name", label: "Employee", render: (row) => <div><p className="font-black">{row.name}</p><p className="text-xs text-slate-500">{row.email || row.phone || "No contact added"}</p></div> },
    { key: "role", label: "Role", render: (row) => <Badge variant="muted">{row.role}</Badge> },
    { key: "branch", label: "Branch" },
    { key: "login", label: "Login" },
    { key: "gross", label: "Gross", align: "right", render: (row) => formatCurrency(row.gross), exportValue: (row) => row.gross },
    { key: "net", label: "Net Pay", align: "right", render: (row) => formatCurrency(row.net), exportValue: (row) => row.net },
    { key: "status", label: "Status", render: (row) => <Badge variant={row.status === "active" ? "success" : row.status === "invited" ? "warning" : "muted"}>{row.status}</Badge> },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex min-w-44 gap-2">
          <Button size="sm" variant="outline" onClick={() => editEmployee(row)}><Edit3 className="size-3" />Edit</Button>
          <Button size="sm" variant="destructive" onClick={() => void removeEmployee(row)}><Trash2 className="size-3" />Delete</Button>
        </div>
      ),
    },
  ];

  function setRole(role: EmployeeRole) {
    setDraft((current) => ({
      ...current,
      role,
      permissions: permissionsForEmployeeRole(role),
      tdsSection: role === "accountant" ? "194J" : current.employmentType === "contract" ? "194C" : "salary",
    }));
  }

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      toast.error("Employee name is required.");
      setStep(0);
      return;
    }
    if (ROLE_LOGIN_REQUIREMENT[draft.role] && !draft.email.trim()) {
      toast.error("Email login is required for this role.");
      setStep(0);
      return;
    }
    if (!draft.branchId) {
      toast.error("Select a branch before saving.");
      setStep(2);
      return;
    }

    const payload: Omit<StaffMember, "id" | "lastActivity"> = {
      name: draft.name.trim(),
      email: draft.email.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      role: draft.role,
      roleId: draft.role,
      branchId: draft.branchId,
      permissions: draft.permissions,
      status: "active",
      requiresLogin: ROLE_LOGIN_REQUIREMENT[draft.role],
      employmentType: draft.employmentType,
      monthlySalary: Number(draft.monthlySalary) || 0,
      contractRate: Number(draft.contractRate) || 0,
      professionalTaxState: draft.professionalTaxState,
      tdsSection: draft.employmentType === "fixed" ? "salary" : draft.tdsSection,
      panNumber: draft.panNumber.trim() || undefined,
      pfNumber: draft.pfNumber.trim() || undefined,
      esiNumber: draft.esiNumber.trim() || undefined,
      payrollEstimate: estimate,
    };

    if (draft.id) {
      const existing = staffMembers.find((member) => member.id === draft.id);
      await updateStaffMember({ ...payload, id: draft.id, lastActivity: "Updated by owner", status: existing?.status ?? "active" });
      toast.success(`${payload.name} updated.`);
    } else {
      await createStaffMember(payload);
      toast.success(`${payload.name} created.`);
    }
    setDraft(emptyDraft(branches[0]?.id ?? ""));
    setStep(0);
  }

  function editEmployee(member: StaffMember) {
    const role = (member.role === "owner" || member.role === "admin" ? "waiter" : member.role) as EmployeeRole;
    setDraft({
      id: member.id,
      name: member.name,
      email: member.email ?? "",
      phone: member.phone ?? "",
      role,
      branchId: member.branchId,
      permissions: member.permissions,
      employmentType: member.employmentType ?? "fixed",
      monthlySalary: String(member.monthlySalary ?? member.payrollEstimate?.grossMonthly ?? ""),
      contractRate: String(member.contractRate ?? ""),
      professionalTaxState: member.professionalTaxState ?? "Karnataka",
      tdsSection: member.tdsSection ?? "salary",
      panNumber: member.panNumber ?? "",
      pfNumber: member.pfNumber ?? "",
      esiNumber: member.esiNumber ?? "",
      pfEnabled: Boolean(member.pfNumber),
      esiEnabled: Boolean(member.esiNumber),
    });
    setStep(0);
  }

  async function removeEmployee(member: StaffMember) {
    await deleteStaffMember(member.id);
    toast.success(`${member.name} removed from active staff.`);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
      <Card className="xl:sticky xl:top-24 xl:self-start">
        <CardContent className="space-y-5 p-5">
          <SectionHeader
            title={draft.id ? "Edit employee" : "Create employee"}
            description="Wizard-style staff onboarding with role access, branch scope, login requirement, and payroll setup."
          />
          <StepTabs step={step} onStep={setStep} />
          <form className="grid gap-4" onSubmit={submitEmployee}>
            {step === 0 ? <BasicStep draft={draft} setDraft={setDraft} /> : null}
            {step === 1 ? <RoleStep draft={draft} setDraft={setDraft} setRole={setRole} /> : null}
            {step === 2 ? <BranchStep branches={branches} draft={draft} setDraft={setDraft} /> : null}
            {step === 3 ? <PayrollStep draft={draft} setDraft={setDraft} estimate={estimate} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1) as WizardStep)}>Back</Button>
              {step < 3 ? (
                <Button type="button" onClick={() => setStep((current) => Math.min(3, current + 1) as WizardStep)}>Continue</Button>
              ) : (
                <Button type="submit"><UserPlus className="size-4" />{draft.id ? "Update employee" : "Create employee"}</Button>
              )}
              {draft.id ? <Button type="button" variant="ghost" onClick={() => { setDraft(emptyDraft(branches[0]?.id ?? "")); setStep(0); }}>Cancel edit</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-5">
        <SectionHeader
          title="Staff & Access"
          description="Email is the login ID for operational staff. Chefs can remain payroll-only when they do not need app login."
          action={<Badge variant="success"><CheckCircle2 className="size-3" />Tenant scoped</Badge>}
        />
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Total employees" value={employeeRows.length} />
          <Metric label="Login enabled" value={employeeRows.filter((row) => row.requiresLogin !== false).length} />
          <Metric label="Payroll gross" value={formatCurrency(employeeRows.reduce((sum, row) => sum + row.gross, 0))} />
          <Metric label="Net payout" value={formatCurrency(employeeRows.reduce((sum, row) => sum + row.net, 0))} />
        </div>
        <AdvancedDataTable title="Employee register" columns={columns} rows={employeeRows} pageSize={8} exportFilename="employee-payroll.csv" />
        <Card>
          <CardContent className="grid gap-3 p-5 md:grid-cols-3">
            <InfoTile icon={KeyRound} title="RBAC" text="Roles pre-fill least-privilege permissions. Owners can still adjust modules before saving." />
            <InfoTile icon={Calculator} title="Payroll estimate" text="TDS, PT, PF and ESI are shown as configurable estimates for accounting review." />
            <InfoTile icon={CheckCircle2} title="Audit ready" text="Salary entries can link back to this employee name and branch for reports." />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StepTabs({ step, onStep }: { step: WizardStep; onStep: (step: WizardStep) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {["Basic", "Role", "Branch", "Payroll"].map((label, index) => (
        <button key={label} type="button" onClick={() => onStep(index as WizardStep)} className={step === index ? "rounded-xl bg-orange-500 px-2 py-2 text-xs font-black text-white" : "rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-black text-slate-600"}>
          {label}
        </button>
      ))}
    </div>
  );
}

function BasicStep({ draft, setDraft }: { draft: EmployeeDraft; setDraft: SetDraft }) {
  return (
    <div className="grid gap-3">
      <Field label="Full name" value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name }))} required />
      <Field label="Email login ID" value={draft.email} onChange={(email) => setDraft((current) => ({ ...current, email }))} type="email" />
      <Field label="Phone number" value={draft.phone} onChange={(phone) => setDraft((current) => ({ ...current, phone }))} />
      <label className="grid gap-2 text-sm font-bold">
        Employment type
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-3" value={draft.employmentType} onChange={(event) => setDraft((current) => ({ ...current, employmentType: event.target.value as PayrollEmploymentType, tdsSection: event.target.value === "fixed" ? "salary" : "194C" }))}>
          <option value="fixed">Fixed salary</option>
          <option value="contract">Contract based</option>
        </select>
      </label>
    </div>
  );
}

function RoleStep({ draft, setDraft, setRole }: { draft: EmployeeDraft; setDraft: SetDraft; setRole: (role: EmployeeRole) => void }) {
  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm font-bold">
        Role
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-3" value={draft.role} onChange={(event) => setRole(event.target.value as EmployeeRole)}>
          {OWNER_EMPLOYEE_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      </label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="font-black">{ROLE_LOGIN_REQUIREMENT[draft.role] ? "Login required" : "Payroll-only role"}</p>
        <p className="mt-1 text-slate-600">{roleDescription(draft.role)}</p>
        <p className="mt-2 font-semibold text-slate-700">{ROLE_ACCESS_LABELS[draft.role]}</p>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-black text-slate-700">Permissions</p>
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
          {permissionsForEmployeeRole(draft.role).map((permission) => (
            <label key={permission} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={draft.permissions.includes(permission)}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  permissions: event.target.checked
                    ? Array.from(new Set([...current.permissions, permission]))
                    : current.permissions.filter((item) => item !== permission),
                }))}
              />
              {permission}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function BranchStep({ branches, draft, setDraft }: { branches: Array<{ id: string; name: string }>; draft: EmployeeDraft; setDraft: SetDraft }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      Branch assignment
      <select className="h-11 rounded-xl border border-slate-200 bg-white px-3" value={draft.branchId} onChange={(event) => setDraft((current) => ({ ...current, branchId: event.target.value }))} disabled={!branches.length}>
        {!branches.length ? <option value="">Create a branch first</option> : null}
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
    </label>
  );
}

function PayrollStep({ draft, setDraft, estimate }: { draft: EmployeeDraft; setDraft: SetDraft; estimate: ReturnType<typeof calculatePayrollEstimate> }) {
  return (
    <div className="grid gap-3">
      {draft.employmentType === "fixed" ? (
        <Field label="Monthly salary" value={draft.monthlySalary} onChange={(monthlySalary) => setDraft((current) => ({ ...current, monthlySalary }))} type="number" />
      ) : (
        <>
          <Field label="Contract monthly estimate" value={draft.contractRate} onChange={(contractRate) => setDraft((current) => ({ ...current, contractRate }))} type="number" />
          <label className="grid gap-2 text-sm font-bold">
            TDS section
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-3" value={draft.tdsSection} onChange={(event) => setDraft((current) => ({ ...current, tdsSection: event.target.value as PayrollTdsSection }))}>
              <option value="194C">194C contractor</option>
              <option value="194J">194J professional</option>
            </select>
          </label>
        </>
      )}
      <Field label="Professional tax state" value={draft.professionalTaxState} onChange={(professionalTaxState) => setDraft((current) => ({ ...current, professionalTaxState }))} />
      <Field label="PAN number" value={draft.panNumber} onChange={(panNumber) => setDraft((current) => ({ ...current, panNumber }))} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-black">
          PF applicable
          <input type="checkbox" checked={draft.pfEnabled} onChange={(event) => setDraft((current) => ({ ...current, pfEnabled: event.target.checked }))} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-black">
          ESI applicable
          <input type="checkbox" checked={draft.esiEnabled} onChange={(event) => setDraft((current) => ({ ...current, esiEnabled: event.target.checked }))} />
        </label>
      </div>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
        Gross {formatCurrency(estimate.grossMonthly)} · TDS {formatCurrency(estimate.tdsMonthly)} · PT {formatCurrency(estimate.professionalTaxMonthly)} · Net {formatCurrency(estimate.netMonthly)}
      </div>
    </div>
  );
}

type SetDraft = Dispatch<SetStateAction<EmployeeDraft>>;

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label>{label}{required ? " *" : ""}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-4"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></CardContent></Card>;
}

function InfoTile({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <Icon className="size-5 text-orange-500" />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function emptyDraft(branchId: string): EmployeeDraft {
  const role = "waiter" as const;
  return {
    name: "",
    email: "",
    phone: "",
    role,
    branchId,
    permissions: permissionsForEmployeeRole(role),
    employmentType: "fixed",
    monthlySalary: "",
    contractRate: "",
    professionalTaxState: "Karnataka",
    tdsSection: "salary",
    panNumber: "",
    pfNumber: "",
    esiNumber: "",
    pfEnabled: false,
    esiEnabled: false,
  };
}
