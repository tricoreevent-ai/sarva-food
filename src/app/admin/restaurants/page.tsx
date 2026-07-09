"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/client-toast";
import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  KeyRound,
  MailCheck,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  WalletCards,
  X,
} from "lucide-react";
import { SafeImage, IMAGE_FALLBACKS } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import {
  getPlanDefinition,
  getUpgradeRecommendations,
  normalizePlan,
  ownerModuleDefinitions,
  planAllowsFeature,
  planDefinitions,
  type OwnerFeatureKey,
  type PlanKey,
} from "@/lib/access-control";
import type { DemoOrder, Restaurant, RestaurantBranch, StaffMember } from "@/lib/types";
import { cn, formatCurrency, getInitials } from "@/lib/utils";

type AdminStatus = NonNullable<Restaurant["adminStatus"]>;
type BillingStatus = NonNullable<Restaurant["billingStatus"]>;

type RestaurantRow = Omit<Restaurant, "branchLimit" | "employeeLimit"> & {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city: string;
  planKey: PlanKey;
  statusLabel: AdminStatus;
  billingLabel: BillingStatus;
  branchCount: number;
  employeeCount: number;
  branchLimit: number | "unlimited";
  employeeLimit: number | "unlimited";
  monthlyOrders: number;
  revenue: number;
  trialLeft: string;
  renewalLabel: string;
  onboardingLabel: string;
};

type CreateDraft = {
  restaurantName: string;
  cuisine: string;
  address: string;
  city: string;
  phone: string;
  deliveryRadius: string;
  gst: string;
  fssai: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: PlanKey;
  enabledModules: OwnerFeatureKey[];
};

const allStatuses: Array<"All" | AdminStatus> = ["All", "Active", "Pending Approval", "Under Review", "Suspended", "Expired"];
const allBillingStatuses: Array<"All" | BillingStatus> = ["All", "current", "past-due", "failed", "manual", "custom"];
const allPlans: Array<"All" | PlanKey> = ["All", "Trial", "Starter", "Growth", "Pro", "Enterprise"];
const ownerLoginOptions = ["Enabled", "Disabled"] as const;

const emptyDraft: CreateDraft = {
  restaurantName: "",
  cuisine: "",
  address: "",
  city: "",
  phone: "",
  deliveryRadius: "5",
  gst: "",
  fssai: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  plan: "Starter",
  enabledModules: getPlanDefinition("Starter").modules,
};

export default function AdminRestaurantsPage() {
  const {
    restaurants,
    businessApplications: applications,
    branches,
    staffMembers,
    orders,
    submitBusinessApplication,
    reviewBusinessApplication,
    updateRestaurantAdminState,
  } = useAdminRepositoryData();

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<"All" | PlanKey>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | AdminStatus>("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [billingFilter, setBillingFilter] = useState<"All" | BillingStatus>("All");
  const [trialOnly, setTrialOnly] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [editState, setEditState] = useState<{ slug: string; draft: Partial<Restaurant> } | null>(null);

  const rows = useMemo(() => {
    return restaurants.map((restaurant) => buildRestaurantRow(restaurant, branches, staffMembers, orders));
  }, [branches, orders, restaurants, staffMembers]);

  const cities = useMemo(() => ["All", ...Array.from(new Set(rows.map((row) => row.city).filter(Boolean))).sort()], [rows]);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => !term || `${row.name} ${row.ownerName} ${row.ownerEmail} ${row.ownerPhone} ${row.location} ${row.cuisine}`.toLowerCase().includes(term))
      .filter((row) => planFilter === "All" || row.planKey === planFilter)
      .filter((row) => statusFilter === "All" || row.statusLabel === statusFilter)
      .filter((row) => cityFilter === "All" || row.city === cityFilter)
      .filter((row) => billingFilter === "All" || row.billingLabel === billingFilter)
      .filter((row) => !trialOnly || row.subscriptionStatus === "trialing" || row.planKey === "Trial");
  }, [billingFilter, cityFilter, planFilter, query, rows, statusFilter, trialOnly]);

  const selected = rows.find((row) => row.slug === selectedSlug) ?? filteredRows[0] ?? rows[0];
  const editDraft = selected
    ? editState?.slug === selected.slug ? editState.draft : buildEditDraft(selected)
    : {};
  const setEditDraft = (draft: Partial<Restaurant>) => {
    if (!selected) return;
    setEditState({ slug: selected.slug, draft });
  };

  const stats = useMemo(() => ({
    total: rows.length,
    live: rows.filter((row) => row.statusLabel === "Active" && row.orderingEnabled !== false).length,
    pending: rows.filter((row) => row.statusLabel === "Pending Approval" || row.statusLabel === "Under Review").length + applications.filter((item) => item.status === "pending").length,
    suspended: rows.filter((row) => row.statusLabel === "Suspended" || row.statusLabel === "Expired").length,
    trialExpiring: rows.filter((row) => daysLeft(row.trialEndsAt) <= 7 && daysLeft(row.trialEndsAt) >= 0).length,
    revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
  }), [applications, rows]);

  async function updateSelected(patch: Partial<Restaurant>, message: string) {
    if (!selected) return;
    await updateRestaurantAdminState(selected.slug, patch);
    toast.success(message);
  }

  async function saveDetailChanges() {
    if (!selected) return;
    setSaving(true);
    try {
      const nextPlan = normalizePlan(editDraft.subscriptionPlan);
      await updateSelected({
        ...editDraft,
        displayName: editDraft.name,
        subscriptionPlan: nextPlan,
        approved: editDraft.adminStatus === "Suspended" || editDraft.adminStatus === "Expired" ? false : editDraft.approved,
        isOpen: editDraft.orderingEnabled === false || editDraft.frozen ? false : selected.isOpen,
      }, "Restaurant settings saved.");
    } finally {
      setSaving(false);
    }
  }

  async function createRestaurant() {
    if (!createDraft.restaurantName.trim() || !createDraft.ownerEmail.trim()) {
      toast.error("Restaurant name and owner email are required.");
      return;
    }
    setSaving(true);
    try {
      const slug = slugify(createDraft.restaurantName);
      const branchId = `${slug}-main`;
      const credentialResult = await sendOwnerCredential({
        action: "create-owner",
        email: createDraft.ownerEmail,
        ownerName: createDraft.ownerName || createDraft.ownerEmail,
        ownerPhone: createDraft.ownerPhone,
        restaurantSlug: slug,
        restaurantName: createDraft.restaurantName,
        branchId,
      });
      const application = await submitBusinessApplication({
        tenantId: slug,
        businessName: createDraft.restaurantName,
        hotelName: createDraft.restaurantName,
        ownerName: createDraft.ownerName || createDraft.ownerEmail,
        ownerEmail: createDraft.ownerEmail,
        mobile: createDraft.ownerPhone || createDraft.phone,
        cuisine: createDraft.cuisine || "Multi cuisine",
        area: createDraft.city || createDraft.address,
        address: createDraft.address || createDraft.city,
        logo: BRAND_ASSETS.appIcon,
        googleMapLocation: "",
        latitude: 12.9719,
        longitude: 77.6412,
        locationVerified: false,
        gstDetails: createDraft.gst || undefined,
        phoneNumber: createDraft.phone || createDraft.ownerPhone,
        operatingHours: "",
        fssaiLicense: createDraft.fssai || undefined,
        diningAvailable: true,
        cloudKitchen: false,
        deliveryRadiusKm: Number(createDraft.deliveryRadius) || 5,
        restaurantImages: [],
        foodImages: [],
      });
      await reviewBusinessApplication(application.id, "approved");
      await updateRestaurantAdminState(slug, {
        ownerId: credentialResult.uid,
        ownerIds: [credentialResult.uid],
        subscriptionPlan: createDraft.plan,
        subscriptionStatus: createDraft.plan === "Trial" ? "trialing" : "active",
        billingStatus: "current",
        adminStatus: "Active",
        ownerLoginEnabled: true,
        forcePasswordReset: true,
        branchLimit: limitForPlan(createDraft.plan, "branches"),
        employeeLimit: limitForPlan(createDraft.plan, "employees"),
        enabledModules: createDraft.enabledModules,
        hiddenOwnerNavItems: ownerModuleDefinitions.filter((module) => !createDraft.enabledModules.includes(module.key)).map((module) => module.key),
        onboardingStatus: "profile",
        lastCredentialsSentAt: new Date().toISOString(),
      });
      setSelectedSlug(slug);
      setEditState(null);
      setCreateOpen(false);
      setCreateStep(1);
      setCreateDraft(emptyDraft);
      toast.success(credentialResult.emailSent ? "Restaurant created and credentials sent." : "Restaurant created. SMTP is not configured, so email was skipped.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create restaurant.");
    } finally {
      setSaving(false);
    }
  }

  async function sendOwnerCredential(input: {
    action: "create-owner" | "reset-password" | "send-credentials" | "toggle-login";
    email: string;
    ownerName: string;
    ownerPhone?: string;
    restaurantSlug: string;
    restaurantName: string;
    branchId?: string;
    loginEnabled?: boolean;
  }) {
    const response = await fetch("/api/admin/owner-credentials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; uid?: string; error?: string; emailSent?: boolean };
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Credential action failed.");
    return {
      uid: payload.uid || `owner-${slugify(input.email)}`,
      emailSent: Boolean(payload.emailSent),
    };
  }

  async function runCredentialAction(action: "reset-password" | "send-credentials" | "toggle-login", loginEnabled?: boolean) {
    if (!selected || !selected.ownerEmail) {
      toast.error("Owner email is missing.");
      return;
    }
    setSaving(true);
    try {
      const result = await sendOwnerCredential({
        action,
        email: selected.ownerEmail,
        ownerName: selected.ownerName,
        restaurantSlug: selected.slug,
        restaurantName: selected.name,
        branchId: selected.branchId,
        loginEnabled,
      });
      await updateRestaurantAdminState(selected.slug, {
        ownerLoginEnabled: action === "toggle-login" ? loginEnabled : selected.ownerLoginEnabled !== false,
        forcePasswordReset: action === "reset-password" ? true : selected.forcePasswordReset,
        lastCredentialsSentAt: action === "send-credentials" || action === "reset-password" ? new Date().toISOString() : selected.lastCredentialsSentAt,
      });
      toast.success(`${credentialActionLabel(action)} completed.${result.emailSent ? "" : " Email skipped because SMTP is not configured."}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Credential action failed.");
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setPlanFilter("All");
    setStatusFilter("All");
    setCityFilter("All");
    setBillingFilter("All");
    setTrialOnly(false);
  }

  return (
    <main className="min-h-screen rounded-[1.5rem] border border-white/10 bg-[#060a16] p-3 text-white shadow-2xl shadow-black/30 sm:p-4">
      <section className="rounded-[1.25rem] border border-white/10 bg-gradient-to-br from-[#0d1226] via-[#080d1d] to-[#06111d] p-4 shadow-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
              <Sparkles className="size-3.5" />
              Restaurant SaaS Control Center
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-normal sm:text-3xl">Restaurants</h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">Manage restaurants, owner access, plans, modules, limits, onboarding, and billing status.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Add Restaurant
            </Button>
            <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link href="/admin/plans">
                <WalletCards className="size-4" />
                Plans
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Total Restaurants" value={stats.total} icon={Store} tone="indigo" />
          <MetricCard label="Live" value={stats.live} icon={CheckCircle2} tone="emerald" />
          <MetricCard label="Pending" value={stats.pending} icon={Clock3} tone="amber" />
          <MetricCard label="Suspended" value={stats.suspended} icon={Ban} tone="red" />
          <MetricCard label="Trial Expiring" value={stats.trialExpiring} icon={RefreshCw} tone="cyan" />
          <MetricCard label="Revenue" value={formatCurrency(stats.revenue)} icon={CreditCard} tone="violet" />
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-xl">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_repeat(5,minmax(130px,0.7fr))_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search restaurant, owner email, phone..." className="h-11 border-white/10 bg-[#0b1020] pl-10 text-white placeholder:text-slate-500" />
              </div>
              <DarkSelect value={statusFilter} onChange={(value) => setStatusFilter(value as typeof statusFilter)} options={allStatuses} />
              <DarkSelect value={planFilter} onChange={(value) => setPlanFilter(value as typeof planFilter)} options={allPlans} />
              <DarkSelect value={cityFilter} onChange={setCityFilter} options={cities} />
              <DarkSelect value={billingFilter} onChange={(value) => setBillingFilter(value as typeof billingFilter)} options={allBillingStatuses} />
              <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm font-bold text-slate-300">
                <input type="checkbox" checked={trialOnly} onChange={(event) => setTrialOnly(event.target.checked)} />
                Trial
              </label>
              <Button variant="outline" className="h-11 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={clearFilters}>
                <X className="size-4" />
                Clear
              </Button>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-[#090e1d] shadow-2xl lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Restaurant</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Usage</th>
                    <th className="px-4 py-3">Trial</th>
                    <th className="px-4 py-3">Renewal</th>
                    <th className="px-4 py-3">Orders</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredRows.map((row) => (
                    <tr key={row.slug} className={cn("transition hover:bg-white/[0.04]", selected?.slug === row.slug && "bg-emerald-400/[0.06]")} onClick={() => selectRestaurant(row, setSelectedSlug, setEditState)}>
                      <td className="px-4 py-3">
                        <RestaurantIdentity row={row} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black text-white">{row.ownerName}</p>
                        <p className="mt-1 text-xs text-slate-400">{row.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-200">{row.city}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.deliveryRadiusKm ?? row.deliverySettings?.radiusKm ?? 5} km delivery</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={row.statusLabel} /></td>
                      <td className="px-4 py-3"><PlanBadge plan={row.planKey} /></td>
                      <td className="px-4 py-3">
                        <UsageLine label="Branches" used={row.branchCount} limit={row.branchLimit} />
                        <UsageLine label="Employees" used={row.employeeCount} limit={row.employeeLimit} />
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-300">{row.trialLeft}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-300">{row.renewalLabel}</td>
                      <td className="px-4 py-3 font-black">{row.monthlyOrders}</td>
                      <td className="px-4 py-3 font-black text-emerald-300">{formatCurrency(row.revenue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <IconButton label="View" onClick={() => selectRestaurant(row, setSelectedSlug, setEditState)}><Eye className="size-4" /></IconButton>
                          <IconButton label="Edit" onClick={() => selectRestaurant(row, setSelectedSlug, setEditState)}><Pencil className="size-4" /></IconButton>
                          <IconButton label="Reset password" onClick={() => void runCredentialAction("reset-password")}><KeyRound className="size-4" /></IconButton>
                          <IconButton label="More" onClick={() => selectRestaurant(row, setSelectedSlug, setEditState)}><MoreVertical className="size-4" /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filteredRows.map((row) => (
              <button key={row.slug} type="button" onClick={() => selectRestaurant(row, setSelectedSlug, setEditState)} className="rounded-2xl border border-white/10 bg-[#090e1d] p-3 text-left shadow-xl">
                <div className="flex items-start gap-3">
                  <RestaurantThumb row={row} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-black text-white">{row.name}</h2>
                      <StatusBadge status={row.statusLabel} />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{row.cuisine} · {row.city}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <MobileFact label="Plan" value={row.planKey} />
                      <MobileFact label="Owner" value={row.ownerName} />
                      <MobileFact label="Branches" value={`${row.branchCount}/${formatLimit(row.branchLimit)}`} />
                      <MobileFact label="Revenue" value={formatCurrency(row.revenue)} />
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-slate-500" />
                </div>
              </button>
            ))}
          </div>

          <p className="px-1 text-sm font-semibold text-slate-500">Showing {filteredRows.length} of {rows.length} restaurants</p>
        </div>

        {selected ? (
          <DetailPanel
            row={selected}
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            saving={saving}
            onSave={() => void saveDetailChanges()}
            onActivate={() => void updateSelected({ adminStatus: "Active", approved: true, orderingEnabled: true, frozen: false, subscriptionStatus: selected.planKey === "Trial" ? "trialing" : "active" }, "Restaurant activated.")}
            onSuspend={() => void updateSelected({ adminStatus: "Suspended", approved: false, orderingEnabled: false, subscriptionStatus: "suspended", isOpen: false }, "Restaurant suspended.")}
            onReset={() => void runCredentialAction("reset-password")}
            onCredentials={() => void runCredentialAction("send-credentials")}
            onToggleLogin={(enabled) => void runCredentialAction("toggle-login", enabled)}
          />
        ) : null}
      </section>

      <CreateRestaurantDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        step={createStep}
        setStep={setCreateStep}
        draft={createDraft}
        setDraft={setCreateDraft}
        saving={saving}
        onCreate={() => void createRestaurant()}
      />
    </main>
  );
}

function DetailPanel({
  row,
  editDraft,
  setEditDraft,
  saving,
  onSave,
  onActivate,
  onSuspend,
  onReset,
  onCredentials,
  onToggleLogin,
}: {
  row: RestaurantRow;
  editDraft: Partial<Restaurant>;
  setEditDraft: (draft: Partial<Restaurant>) => void;
  saving: boolean;
  onSave: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onReset: () => void;
  onCredentials: () => void;
  onToggleLogin: (enabled: boolean) => void;
}) {
  const plan = getPlanDefinition(editDraft.subscriptionPlan ?? row.planKey);
  const enabledModules = (editDraft.enabledModules as OwnerFeatureKey[] | undefined) ?? plan.modules;
  const recommendations = getUpgradeRecommendations({
    plan: editDraft.subscriptionPlan ?? row.planKey,
    branchCount: row.branchCount,
    employeeCount: row.employeeCount,
    requestedFeatures: enabledModules,
  });

  function toggleModule(key: OwnerFeatureKey) {
    const next = enabledModules.includes(key)
      ? enabledModules.filter((item) => item !== key)
      : [...enabledModules, key];
    setEditDraft({
      ...editDraft,
      enabledModules: next,
      hiddenOwnerNavItems: ownerModuleDefinitions.filter((module) => !next.includes(module.key)).map((module) => module.key),
      featureAccess: { ...(editDraft.featureAccess ?? {}), [key]: next.includes(key) },
    });
  }

  return (
    <aside className="min-w-0 rounded-2xl border border-white/10 bg-[#090e1d] shadow-2xl xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
      <div className="relative h-40 overflow-hidden rounded-t-2xl">
        <SafeImage src={row.coverImage || row.coverImages?.[0] || row.image} fallbackSrc={IMAGE_FALLBACKS.restaurant} alt={row.name} fill sizes="430px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090e1d] via-[#090e1d]/30 to-transparent" />
        <StatusBadge className="absolute left-4 top-4" status={row.statusLabel} />
      </div>
      <div className="relative px-4 pb-4">
        <div className="-mt-10 flex items-end gap-3">
          <div className="grid size-20 place-items-center overflow-hidden rounded-2xl border border-emerald-400/40 bg-[#0b1020] text-xl font-black text-emerald-300 shadow-xl">
            {row.logo ? <SafeImage src={row.logo} alt={`${row.name} logo`} width={80} height={80} className="h-full w-full object-cover" /> : getInitials(row.name)}
          </div>
          <div className="min-w-0 pb-1">
            <h2 className="truncate text-xl font-black text-white">{row.name}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">{row.cuisine} · {row.location}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <PanelAction label="View restaurant" href={`/restaurant/${row.slug}`} icon={ArrowUpRight} />
          <PanelAction label="Open owner" href="/owner" icon={Store} />
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={onReset}><KeyRound className="size-4" />Reset password</Button>
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={onCredentials}><MailCheck className="size-4" />Send credentials</Button>
        </div>

        <div className="mt-4 grid gap-3">
          <PanelSection title="Restaurant info">
            <DarkField label="Restaurant name" value={String(editDraft.name ?? "")} onChange={(value) => setEditDraft({ ...editDraft, name: value })} />
            <DarkField label="Cuisine" value={String(editDraft.cuisine ?? "")} onChange={(value) => setEditDraft({ ...editDraft, cuisine: value })} />
            <DarkField label="Location" value={String(editDraft.location ?? "")} onChange={(value) => setEditDraft({ ...editDraft, location: value })} />
            <DarkField label="Delivery radius km" type="number" value={String(editDraft.deliveryRadiusKm ?? "")} onChange={(value) => setEditDraft({ ...editDraft, deliveryRadiusKm: Number(value) || 0 })} />
          </PanelSection>

          <PanelSection title="Owner info">
            <InfoRow label="Owner name" value={row.ownerName} />
            <InfoRow label="Owner username" value={row.ownerEmail} />
            <InfoRow label="Owner phone" value={row.ownerPhone || "Not set"} />
            <div className="grid grid-cols-2 gap-2">
              {ownerLoginOptions.map((option) => {
                const enabled = option === "Enabled";
                const active = (editDraft.ownerLoginEnabled !== false) === enabled;
                return (
                  <button key={option} type="button" onClick={() => {
                    setEditDraft({ ...editDraft, ownerLoginEnabled: enabled });
                    onToggleLogin(enabled);
                  }} className={cn("rounded-xl border px-3 py-2 text-sm font-black", active ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-slate-400")}>
                    Login {option}
                  </button>
                );
              })}
            </div>
          </PanelSection>

          <PanelSection title="Subscription & limits">
            <div className="grid grid-cols-2 gap-2">
              <DarkSelect value={normalizePlan(editDraft.subscriptionPlan)} onChange={(value) => setEditDraft({ ...editDraft, subscriptionPlan: value as PlanKey })} options={allPlans.filter((item) => item !== "All")} />
              <DarkSelect value={String(editDraft.adminStatus ?? row.statusLabel)} onChange={(value) => setEditDraft({ ...editDraft, adminStatus: value as AdminStatus })} options={allStatuses.filter((item) => item !== "All")} />
              <DarkField label="Branch limit" type="number" value={String(editDraft.branchLimit ?? "")} onChange={(value) => setEditDraft({ ...editDraft, branchLimit: Number(value) || undefined })} />
              <DarkField label="Employee limit" type="number" value={String(editDraft.employeeLimit ?? "")} onChange={(value) => setEditDraft({ ...editDraft, employeeLimit: Number(value) || undefined })} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <UsagePanel label="Branches" used={row.branchCount} limit={editDraft.branchLimit ?? row.branchLimit} />
              <UsagePanel label="Employees" used={row.employeeCount} limit={editDraft.employeeLimit ?? row.employeeLimit} />
            </div>
          </PanelSection>

          <PanelSection title="Enabled modules">
            <div className="grid gap-2">
              {ownerModuleDefinitions.map((module) => {
                const allowed = planAllowsFeature(editDraft.subscriptionPlan ?? row.planKey, module.key);
                const checked = enabledModules.includes(module.key);
                return (
                  <button key={module.key} type="button" onClick={() => toggleModule(module.key)} className={cn("grid grid-cols-[1fr_auto] gap-3 rounded-xl border p-3 text-left transition", checked ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.03]", !allowed && "border-amber-400/30 bg-amber-400/10")}>
                    <span>
                      <span className="block text-sm font-black text-white">{module.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-400">{module.description}</span>
                    </span>
                    <span className={cn("mt-1 h-5 w-9 rounded-full border p-0.5", checked ? "border-emerald-300 bg-emerald-400" : "border-white/20 bg-slate-800")}>
                      <span className={cn("block size-3.5 rounded-full bg-white transition", checked && "translate-x-4")} />
                    </span>
                  </button>
                );
              })}
            </div>
          </PanelSection>

          {recommendations.length ? (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3">
              <p className="font-black text-amber-200">Upgrade recommendation</p>
              {recommendations.map((item) => <p key={item} className="mt-2 text-xs leading-5 text-amber-100/85">{item}</p>)}
            </div>
          ) : null}

          <PanelSection title="Audit note">
            <Textarea value={String(editDraft.adminNote ?? "")} onChange={(event) => setEditDraft({ ...editDraft, adminNote: event.target.value })} className="min-h-24 border-white/10 bg-[#0b1020] text-white placeholder:text-slate-500" placeholder="Reason for plan/status/module change" />
            <InfoRow label="Credentials sent" value={row.lastCredentialsSentAt ? formatDate(row.lastCredentialsSentAt) : "Not sent"} />
          </PanelSection>
        </div>

        <div className="sticky bottom-0 mt-4 grid grid-cols-3 gap-2 bg-[#090e1d] py-3">
          <Button variant="outline" className="border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20" onClick={onSuspend}><Ban className="size-4" />Suspend</Button>
          <Button variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20" onClick={onActivate}><CheckCircle2 className="size-4" />Activate</Button>
          <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </aside>
  );
}

function CreateRestaurantDialog({ open, onOpenChange, step, setStep, draft, setDraft, saving, onCreate }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: number;
  setStep: (step: number) => void;
  draft: CreateDraft;
  setDraft: (draft: CreateDraft) => void;
  saving: boolean;
  onCreate: () => void;
}) {
  const plan = getPlanDefinition(draft.plan);
  function selectPlan(planKey: PlanKey) {
    setDraft({ ...draft, plan: planKey, enabledModules: getPlanDefinition(planKey).modules });
  }
  function toggleModule(key: OwnerFeatureKey) {
    const enabledModules = draft.enabledModules.includes(key)
      ? draft.enabledModules.filter((item) => item !== key)
      : [...draft.enabledModules, key];
    setDraft({ ...draft, enabledModules });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto border-white/10 bg-[#080d1d] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white">Create restaurant</DialogTitle>
          <DialogDescription className="text-slate-400">Step-based onboarding creates the profile shell, owner access, subscription, and module visibility.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <button key={item} type="button" onClick={() => setStep(item)} className={cn("mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-black", step === item ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10")}>
                <span className="grid size-7 place-items-center rounded-full bg-black/10">{item}</span>
                {["Restaurant", "Owner", "Plan", "Features", "Review"][item - 1]}
              </button>
            ))}
          </aside>
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {step === 1 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <CreateField label="Restaurant name" value={draft.restaurantName} onChange={(value) => setDraft({ ...draft, restaurantName: value })} />
                <CreateField label="Cuisine" value={draft.cuisine} onChange={(value) => setDraft({ ...draft, cuisine: value })} />
                <CreateField label="City" value={draft.city} onChange={(value) => setDraft({ ...draft, city: value })} />
                <CreateField label="Phone" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} />
                <CreateField label="Delivery radius" value={draft.deliveryRadius} type="number" onChange={(value) => setDraft({ ...draft, deliveryRadius: value })} />
                <CreateField label="GST" value={draft.gst} onChange={(value) => setDraft({ ...draft, gst: value })} />
                <CreateField label="FSSAI" value={draft.fssai} onChange={(value) => setDraft({ ...draft, fssai: value })} />
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm font-black text-slate-300">Address</span>
                  <Textarea value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} className="min-h-24 border-white/10 bg-[#0b1020] text-white" />
                </label>
              </div>
            ) : null}
            {step === 2 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <CreateField label="Owner name" value={draft.ownerName} onChange={(value) => setDraft({ ...draft, ownerName: value })} />
                <CreateField label="Owner email / username" type="email" value={draft.ownerEmail} onChange={(value) => setDraft({ ...draft, ownerEmail: value })} />
                <CreateField label="Owner phone" value={draft.ownerPhone} onChange={(value) => setDraft({ ...draft, ownerPhone: value })} />
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                  Owner email becomes the username. The system generates a temporary password and queues the welcome email.
                </div>
              </div>
            ) : null}
            {step === 3 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {planDefinitions.map((item) => (
                  <button key={item.key} type="button" onClick={() => selectPlan(item.key)} className={cn("rounded-2xl border p-4 text-left transition", draft.plan === item.key ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-white">{item.label}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                      </div>
                      <Badge variant="secondary">{item.priceLabel}</Badge>
                    </div>
                    <p className="mt-3 text-xs font-bold text-emerald-300">{item.badge}</p>
                  </button>
                ))}
              </div>
            ) : null}
            {step === 4 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {ownerModuleDefinitions.map((module) => (
                  <button key={module.key} type="button" disabled={!planAllowsFeature(draft.plan, module.key)} onClick={() => toggleModule(module.key)} className={cn("rounded-2xl border p-3 text-left transition", draft.enabledModules.includes(module.key) ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-white/[0.03]", !planAllowsFeature(draft.plan, module.key) && "opacity-45")}>
                    <p className="font-black text-white">{module.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{module.description}</p>
                  </button>
                ))}
              </div>
            ) : null}
            {step === 5 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1020] p-4">
                  <h3 className="text-xl font-black">{draft.restaurantName || "Restaurant name not set"}</h3>
                  <p className="mt-1 text-sm text-slate-400">{draft.cuisine || "Cuisine not set"} · {draft.city || "City not set"}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <ReviewFact label="Owner" value={draft.ownerName || draft.ownerEmail || "Not set"} />
                    <ReviewFact label="Plan" value={`${plan.label} ${plan.priceLabel}`} />
                    <ReviewFact label="Modules" value={`${draft.enabledModules.length} enabled`} />
                  </div>
                </div>
                <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400" size="lg" onClick={onCreate} disabled={saving}>
                  {saving ? "Creating..." : "Create restaurant and owner access"}
                </Button>
              </div>
            ) : null}
            <div className="mt-5 flex justify-between">
              <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Back</Button>
              {step < 5 ? <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => setStep(Math.min(5, step + 1))}>Continue</Button> : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildRestaurantRow(restaurant: Restaurant, branches: RestaurantBranch[], staff: StaffMember[], orders: DemoOrder[]): RestaurantRow {
  const restaurantBranches = branches.filter((branch) => branch.restaurantSlug === restaurant.slug || branch.restaurantSlug === restaurant.id);
  const branchIds = restaurantBranches.map((branch) => branch.id);
  const owner = staff.find((member) => member.id === restaurant.ownerId || restaurant.ownerIds?.includes(member.id) || member.email === restaurant.ownerProfile?.businessEmail);
  const planKey = normalizePlan(restaurant.subscriptionPlan);
  const plan = getPlanDefinition(planKey);
  const restaurantOrders = orders.filter((order) => order.restaurantSlug === restaurant.slug || order.restaurantSlug === restaurant.id);
  const statusLabel = deriveStatus(restaurant);
  return {
    ...restaurant,
    planKey,
    statusLabel,
    billingLabel: restaurant.billingStatus ?? (restaurant.subscriptionStatus === "expired" ? "past-due" : "current"),
    ownerName: owner?.name ?? restaurant.ownerProfile?.businessEmail?.split("@")[0] ?? restaurant.ownerId ?? "Owner not assigned",
    ownerEmail: owner?.email ?? restaurant.ownerProfile?.businessEmail ?? restaurant.contact?.supportEmail ?? "",
    ownerPhone: owner?.phone ?? restaurant.ownerProfile?.businessPhone ?? restaurant.contact?.phone ?? "",
    city: restaurant.location?.split(",")[0]?.trim() || restaurant.address?.split(",")[0]?.trim() || "Unknown",
    branchCount: Math.max(restaurantBranches.length, restaurant.branchId ? 1 : 0),
    employeeCount: staff.filter((member) => branchIds.includes(member.branchId) || restaurant.ownerIds?.includes(member.id) || member.id === restaurant.ownerId).length,
    branchLimit: restaurant.branchLimit ?? plan.maxBranches,
    employeeLimit: restaurant.employeeLimit ?? plan.maxEmployees,
    monthlyOrders: restaurantOrders.length,
    revenue: restaurantOrders.reduce((sum, order) => sum + order.totals.total, 0),
    trialLeft: trialLabel(restaurant.trialEndsAt),
    renewalLabel: restaurant.nextBillingAt ? formatDate(restaurant.nextBillingAt) : planKey === "Trial" ? "After trial" : "Not scheduled",
    onboardingLabel: restaurant.onboardingStatus ?? (statusLabel === "Active" ? "completed" : "profile"),
  };
}

function buildEditDraft(selected: RestaurantRow): Partial<Restaurant> {
  return {
    name: selected.name,
    cuisine: selected.cuisine,
    location: selected.location,
    address: selected.address ?? selected.location,
    deliveryRadiusKm: selected.deliveryRadiusKm ?? selected.deliverySettings?.radiusKm ?? 5,
    subscriptionPlan: selected.planKey,
    subscriptionStatus: selected.subscriptionStatus ?? (selected.planKey === "Trial" ? "trialing" : "active"),
    adminStatus: selected.statusLabel,
    billingStatus: selected.billingLabel,
    trialEndsAt: selected.trialEndsAt,
    nextBillingAt: selected.nextBillingAt,
    orderingEnabled: selected.orderingEnabled !== false,
    frozen: Boolean(selected.frozen),
    approved: selected.approved !== false,
    ownerLoginEnabled: selected.ownerLoginEnabled !== false,
    forcePasswordReset: Boolean(selected.forcePasswordReset),
    onboardingStatus: selected.onboardingStatus ?? "profile",
    branchLimit: typeof selected.branchLimit === "number" ? selected.branchLimit : undefined,
    employeeLimit: typeof selected.employeeLimit === "number" ? selected.employeeLimit : undefined,
    enabledModules: selected.enabledModules ?? getPlanDefinition(selected.planKey).modules,
    hiddenOwnerNavItems: selected.hiddenOwnerNavItems ?? [],
    featureAccess: selected.featureAccess ?? {},
    integrationAccess: selected.integrationAccess ?? {},
    adminNote: selected.adminNote ?? "",
  };
}

function selectRestaurant(
  row: RestaurantRow,
  setSelectedSlug: (slug: string) => void,
  setEditState: (state: { slug: string; draft: Partial<Restaurant> }) => void,
) {
  setSelectedSlug(row.slug);
  setEditState({ slug: row.slug, draft: buildEditDraft(row) });
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: typeof Store; tone: "indigo" | "emerald" | "amber" | "red" | "cyan" | "violet" }) {
  const classes = {
    indigo: "text-indigo-300 bg-indigo-400/10 border-indigo-400/20",
    emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-300 bg-amber-400/10 border-amber-400/20",
    red: "text-red-300 bg-red-400/10 border-red-400/20",
    cyan: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
    violet: "text-violet-300 bg-violet-400/10 border-violet-400/20",
  }[tone];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-xl border", classes)}><Icon className="size-4" /></span>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function RestaurantIdentity({ row }: { row: RestaurantRow }) {
  return (
    <div className="flex items-center gap-3">
      <RestaurantThumb row={row} />
      <div className="min-w-0">
        <p className="truncate font-black text-white">{row.name}</p>
        <p className="mt-1 text-xs text-slate-400">{row.cuisine}</p>
      </div>
    </div>
  );
}

function RestaurantThumb({ row }: { row: RestaurantRow }) {
  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10">
      <SafeImage src={row.logo || row.image} fallbackSrc={IMAGE_FALLBACKS.restaurant} alt={row.name} fill sizes="56px" className="object-cover" />
    </div>
  );
}

function StatusBadge({ status, className }: { status: AdminStatus; className?: string }) {
  const classes = status === "Active"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    : status === "Suspended" || status === "Expired"
      ? "border-red-400/25 bg-red-400/10 text-red-300"
      : "border-amber-400/25 bg-amber-400/10 text-amber-300";
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black", classes, className)}>{status === "Active" ? "+" : "•"} {status}</span>;
}

function PlanBadge({ plan }: { plan: PlanKey }) {
  const classes = plan === "Enterprise"
    ? "border-violet-400/25 bg-violet-400/10 text-violet-300"
    : plan === "Pro"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
      : plan === "Growth"
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
        : "border-white/10 bg-white/5 text-slate-300";
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-black", classes)}>{plan}</span>;
}

function DarkSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm font-bold text-white outline-none">
      {options.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
    </select>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white" aria-label={label} title={label}>
      {children}
    </button>
  );
}

function UsageLine({ label, used, limit }: { label: string; used: number; limit: number | "unlimited" }) {
  return <p className="text-xs font-bold text-slate-400">{label}: <span className="text-slate-200">{used}/{formatLimit(limit)}</span></p>;
}

function UsagePanel({ label, used, limit }: { label: string; used: number; limit: number | "unlimited" | undefined }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-slate-500">{label}</p><p className="mt-1 font-black text-white">{used}/{formatLimit(limit ?? "unlimited")}</p></div>;
}

function MobileFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/[0.04] p-2"><p className="text-slate-500">{label}</p><p className="mt-1 truncate font-black text-slate-100">{value}</p></div>;
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><h3 className="mb-3 font-black text-white">{title}</h3><div className="grid gap-3">{children}</div></section>;
}

function PanelAction({ label, href, icon: Icon }: { label: string; href: string; icon: typeof Store }) {
  return <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10"><Link href={href}><Icon className="size-4" />{label}</Link></Button>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 text-sm"><span className="font-semibold text-slate-500">{label}</span><span className="max-w-[220px] text-right font-bold text-slate-200">{value}</span></div>;
}

function DarkField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-2"><span className="text-xs font-black uppercase text-slate-500">{label}</span><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-[#0b1020] text-white placeholder:text-slate-500" /></label>;
}

function CreateField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-2"><span className="text-sm font-black text-slate-300">{label}</span><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-[#0b1020] text-white placeholder:text-slate-500" /></label>;
}

function ReviewFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black text-white">{value}</p></div>;
}

function deriveStatus(restaurant: Restaurant): AdminStatus {
  if (restaurant.adminStatus) return restaurant.adminStatus;
  if (restaurant.frozen) return "Under Review";
  if (restaurant.subscriptionStatus === "expired") return "Expired";
  if (restaurant.subscriptionStatus === "suspended") return "Suspended";
  if (restaurant.approved === false) return "Pending Approval";
  return "Active";
}

function trialLabel(value?: string) {
  if (!value) return "Not on trial";
  const days = daysLeft(value);
  if (days < 0) return "Expired";
  if (days === 0) return "Ends today";
  return `${days} days left`;
}

function daysLeft(value?: string) {
  if (!value) return 999;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 999;
  return Math.ceil((time - Date.now()) / 86_400_000);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatLimit(value: number | "unlimited") {
  return value === "unlimited" ? "∞" : String(value);
}

function humanize(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "restaurant";
}

function limitForPlan(plan: PlanKey, type: "branches" | "employees") {
  const limit = type === "branches" ? getPlanDefinition(plan).maxBranches : getPlanDefinition(plan).maxEmployees;
  return limit === "unlimited" ? undefined : limit;
}

function credentialActionLabel(action: string) {
  if (action === "reset-password") return "Password reset";
  if (action === "toggle-login") return "Owner login update";
  return "Credentials email";
}
