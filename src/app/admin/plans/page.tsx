"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/client-toast";
import { CheckCircle2, Edit3, Gauge, Plus, Save, Store, Users, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";
import { getPlanDefinition, normalizePlan, ownerModuleDefinitions, planDefinitions, type PlanDefinition, type PlanKey } from "@/lib/access-control";
import { cn, formatCurrency } from "@/lib/utils";

type EditablePlan = PlanDefinition & { enabled: boolean };

export default function AdminPlansPage() {
  const { restaurants, plans: storedPlans, loading, savePlan, updateRestaurantAdminState } = useAdminRepositoryData();
  const [plans, setPlans] = useState<EditablePlan[]>(planDefinitions.map((plan) => ({ ...plan, enabled: true })));
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("Growth");
  const [selectedRestaurant, setSelectedRestaurant] = useState(restaurants[0]?.slug ?? "");
  const restaurantId = selectedRestaurant || restaurants[0]?.slug || "";
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loading || loadedRef.current) return;
    loadedRef.current = true;
    if (storedPlans.length) queueMicrotask(() => setPlans(storedPlans));
  }, [loading, storedPlans]);

  const activePlan = plans.find((plan) => plan.key === selectedPlan) ?? plans[0];
  const assignedCounts = useMemo(() => {
    return plans.map((plan) => ({
      key: plan.key,
      count: restaurants.filter((restaurant) => normalizePlan(restaurant.subscriptionPlan) === plan.key).length,
    }));
  }, [plans, restaurants]);

  function updatePlan(patch: Partial<EditablePlan>) {
    setPlans((current) => current.map((plan) => plan.key === activePlan.key ? { ...plan, ...patch } : plan));
  }

  function toggleModule(moduleKey: string) {
    const modules = activePlan.modules.includes(moduleKey as never)
      ? activePlan.modules.filter((item) => item !== moduleKey)
      : [...activePlan.modules, moduleKey as never];
    updatePlan({ modules });
  }

  async function assignPlan() {
    if (!restaurantId) return toast.error("Select a restaurant.");
    const plan = getPlanDefinition(selectedPlan);
    await updateRestaurantAdminState(restaurantId, {
      subscriptionPlan: selectedPlan,
      subscriptionStatus: selectedPlan === "Trial" ? "trialing" : "active",
      billingStatus: selectedPlan === "Enterprise" ? "custom" : "current",
      branchLimit: plan.maxBranches === "unlimited" ? undefined : plan.maxBranches,
      employeeLimit: plan.maxEmployees === "unlimited" ? undefined : plan.maxEmployees,
      enabledModules: plan.modules,
      hiddenOwnerNavItems: ownerModuleDefinitions.filter((module) => !plan.modules.includes(module.key)).map((module) => module.key),
    });
    toast.success("Plan assigned to restaurant.");
  }

  async function saveActivePlan() {
    await savePlan(activePlan);
    toast.success("Plan configuration saved.");
  }

  return (
    <main className="min-h-screen rounded-[1.5rem] border border-white/10 bg-[#060a16] p-4 text-white shadow-2xl">
      <section className="flex flex-col gap-4 rounded-[1.25rem] border border-white/10 bg-gradient-to-br from-[#111936] to-[#07111f] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-300">
            <WalletCards className="size-3.5" />
            Plan Management
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-normal">Plans & Pricing</h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">Configure plan pricing, modules, limits, trials, restrictions, and restaurant assignments.</p>
        </div>
        <Button className="bg-violet-500 text-white hover:bg-violet-400" onClick={() => setSelectedPlan("Enterprise")}>
          <Plus className="size-4" />
          Edit enterprise plan
        </Button>
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-4">
        {plans.map((plan) => {
          const assigned = assignedCounts.find((item) => item.key === plan.key)?.count ?? 0;
          const active = activePlan.key === plan.key;
          return (
            <button key={plan.key} type="button" onClick={() => setSelectedPlan(plan.key)} className={cn("rounded-2xl border p-4 text-left shadow-xl transition", active ? "border-violet-400 bg-violet-400/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-black">{plan.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">{plan.priceLabel}</p>
                </div>
                <Badge variant={plan.enabled ? "success" : "muted"}>{plan.enabled ? "Active" : "Off"}</Badge>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">{plan.description}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <PlanFact icon={Store} value={limitLabel(plan.maxBranches)} label="Branches" />
                <PlanFact icon={Users} value={limitLabel(plan.maxEmployees)} label="Staff" />
                <PlanFact icon={Gauge} value={assigned} label="Assigned" />
              </div>
            </button>
          );
        })}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-white/10 bg-[#090e1d] p-4 shadow-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">{activePlan.label} configuration</h2>
              <p className="text-sm font-semibold text-slate-400">Changes persist to the platform plan repository.</p>
            </div>
            <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => void saveActivePlan()}>
              <Save className="size-4" />
              Save plan
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <PlanInput label="Plan label" value={activePlan.label} onChange={(value) => updatePlan({ label: value })} />
            <PlanInput label="Price label" value={activePlan.priceLabel} onChange={(value) => updatePlan({ priceLabel: value })} />
            <PlanInput label="Trial days" type="number" value={String(activePlan.trialDays)} onChange={(value) => updatePlan({ trialDays: Number(value) || 0 })} />
            <PlanInput label="Monthly price" type="number" value={String(activePlan.monthlyPrice ?? "")} onChange={(value) => updatePlan({ monthlyPrice: Number(value) || undefined, priceLabel: Number(value) ? formatCurrency(Number(value)) : activePlan.priceLabel })} />
            <PlanInput label="Branch limit" value={String(activePlan.maxBranches)} onChange={(value) => updatePlan({ maxBranches: value === "unlimited" ? "unlimited" : Number(value) || 0 })} />
            <PlanInput label="Employee limit" value={String(activePlan.maxEmployees)} onChange={(value) => updatePlan({ maxEmployees: value === "unlimited" ? "unlimited" : Number(value) || 0 })} />
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-black text-slate-300">Description</span>
              <Textarea value={activePlan.description} onChange={(event) => updatePlan({ description: event.target.value })} className="min-h-24 border-white/10 bg-[#0b1020] text-white" />
            </label>
          </div>

          <div className="mt-5">
            <h3 className="font-black">Feature modules</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {ownerModuleDefinitions.map((module) => {
                const enabled = activePlan.modules.includes(module.key);
                return (
                  <button key={module.key} type="button" onClick={() => toggleModule(module.key)} className={cn("grid grid-cols-[1fr_auto] gap-3 rounded-2xl border p-3 text-left", enabled ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.03]")}>
                    <span>
                      <span className="font-black">{module.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-400">{module.description}</span>
                    </span>
                    {enabled ? <CheckCircle2 className="size-5 text-emerald-300" /> : <Edit3 className="size-5 text-slate-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-[#090e1d] p-4 shadow-xl">
          <h2 className="text-xl font-black">Assign plan</h2>
          <p className="mt-1 text-sm text-slate-400">Apply plan limits and module visibility to a restaurant.</p>
          <div className="mt-4 grid gap-3">
            <select value={restaurantId} onChange={(event) => setSelectedRestaurant(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm font-bold text-white">
              {restaurants.map((restaurant) => <option key={restaurant.slug} value={restaurant.slug}>{restaurant.name}</option>)}
            </select>
            <select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as PlanKey)} className="h-11 rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm font-bold text-white">
              {plans.map((plan) => <option key={plan.key} value={plan.key}>{plan.label}</option>)}
            </select>
            <Button className="bg-violet-500 text-white hover:bg-violet-400" onClick={() => void assignPlan()}>Assign selected plan</Button>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="font-black">Smart upgrade logic</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Branch limit, staff limit, accounting access, API access, and delivery integrations now share the same plan configuration.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function PlanFact({ icon: Icon, value, label }: { icon: typeof Store; value: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <Icon className="size-4 text-violet-300" />
      <p className="mt-1 font-black">{value}</p>
      <p className="text-slate-500">{label}</p>
    </div>
  );
}

function PlanInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-300">{label}</span>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-[#0b1020] text-white" />
    </label>
  );
}

function limitLabel(value: number | "unlimited") {
  return value === "unlimited" ? "∞" : value;
}
