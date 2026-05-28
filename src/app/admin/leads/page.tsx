"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Clock3, Mail, Phone, RefreshCw, Search, UserPlus } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type LeadStatus = "New" | "Contacted" | "Demo Scheduled" | "Documents Pending" | "Approved" | "Rejected" | "Onboarded";
type RestaurantLead = {
  id: string;
  restaurantName: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;
  email: string;
  location: string;
  cuisineType: string;
  restaurantType?: string;
  monthlyOrdersEstimate?: string;
  status: LeadStatus;
  assignedTo?: string;
  notes?: string;
  createdAt?: string;
  convertedRestaurantId?: string;
  generatedTemporaryPassword?: string;
  credentialsEmailStatus?: string;
};

const statuses: LeadStatus[] = ["New", "Contacted", "Demo Scheduled", "Documents Pending", "Approved", "Rejected", "Onboarded"];

export default function AdminRestaurantLeadsPage() {
  const [leads, setLeads] = useState<RestaurantLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const selected = leads.find((lead) => lead.id === selectedId) ?? leads[0];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return leads.filter((lead) => !term || `${lead.restaurantName} ${lead.ownerName} ${lead.email} ${lead.phone} ${lead.location} ${lead.cuisineType}`.toLowerCase().includes(term));
  }, [leads, query]);
  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((lead) => lead.status === "New").length,
    demos: leads.filter((lead) => lead.status === "Demo Scheduled").length,
    approved: leads.filter((lead) => lead.status === "Approved" || lead.status === "Onboarded").length,
  }), [leads]);

  async function loadLeads() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/restaurant-leads", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load leads.");
      setLeads(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }

  async function updateLead(leadId: string, patch: { status?: LeadStatus; assignedTo?: string; note?: string }) {
    const response = await fetch("/api/admin/restaurant-leads", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId, ...patch }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not update lead.");
    toast.success("Lead updated.");
    setNote("");
    await loadLeads();
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadLeads();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Restaurant Leads"
        description="Manage owner onboarding requests, callbacks, approvals, and conversion readiness."
        action={<Button onClick={() => void loadLeads()} disabled={loading}><RefreshCw className="size-4" />Refresh</Button>}
      />
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Total leads" value={stats.total} icon={UserPlus} />
        <Metric label="New" value={stats.new} icon={Clock3} tone="amber" />
        <Metric label="Demos" value={stats.demos} icon={Phone} tone="blue" />
        <Metric label="Approved" value={stats.approved} icon={CheckCircle2} tone="green" />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3">
              <Search className="size-4 text-muted-foreground" />
              <Input className="border-0 shadow-none focus-visible:ring-0" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search restaurant, owner, email, phone, city" />
            </div>
            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_140px] gap-3 border-b bg-muted/60 px-4 py-3 text-xs font-black uppercase text-muted-foreground">
                <span>Restaurant</span><span>Owner</span><span>Location</span><span>Status</span>
              </div>
              {loading ? <p className="p-5 text-sm font-semibold text-muted-foreground">Loading leads...</p> : null}
              {!loading && !filtered.length ? <p className="p-5 text-sm font-semibold text-muted-foreground">No restaurant leads found.</p> : null}
              {filtered.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className={cn("grid w-full grid-cols-[1.4fr_1fr_1fr_140px] gap-3 border-b px-4 py-3 text-left text-sm hover:bg-muted/40", selected?.id === lead.id && "bg-primary/5")}
                  onClick={() => {
                    setSelectedId(lead.id);
                    setAssignedTo(lead.assignedTo ?? "");
                  }}
                >
                  <span><b>{lead.restaurantName}</b><small className="mt-1 block text-muted-foreground">{lead.cuisineType}</small></span>
                  <span><b>{lead.ownerName}</b><small className="mt-1 block text-muted-foreground">{lead.email}</small></span>
                  <span>{lead.location}<small className="mt-1 block text-muted-foreground">{lead.phone}</small></span>
                  <span><StatusBadge status={lead.status} /></span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-4">
            {selected ? (
              <>
                <div>
                  <h2 className="text-xl font-black">{selected.restaurantName}</h2>
                  <p className="text-sm font-semibold text-muted-foreground">{selected.cuisineType} · {selected.location}</p>
                </div>
                <div className="grid gap-2 text-sm">
                  <p className="flex items-center gap-2"><Phone className="size-4 text-primary" />{selected.phone} / {selected.whatsapp || selected.phone}</p>
                  <p className="flex items-center gap-2"><Mail className="size-4 text-primary" />{selected.email}</p>
                  <p><b>Owner:</b> {selected.ownerName}</p>
                  <p><b>Monthly orders:</b> {selected.monthlyOrdersEstimate || "Not shared"}</p>
                  {selected.convertedRestaurantId ? <p><b>Linked restaurant:</b> {selected.convertedRestaurantId}</p> : null}
                  {selected.generatedTemporaryPassword ? <p className="rounded-lg border bg-amber-50 p-2 text-amber-700"><b>Temporary password:</b> {selected.generatedTemporaryPassword}</p> : null}
                  {selected.credentialsEmailStatus ? <p className="text-xs font-semibold text-muted-foreground">{selected.credentialsEmailStatus}</p> : null}
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">Status</label>
                  <select className="h-11 rounded-lg border bg-background px-3 text-sm font-bold" value={selected.status} onChange={(event) => void updateLead(selected.id, { status: event.target.value as LeadStatus })}>
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">Assigned onboarding owner</label>
                  <div className="flex gap-2">
                    <Input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Team member name" />
                    <Button type="button" onClick={() => void updateLead(selected.id, { assignedTo })}>Assign</Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">Admin note</label>
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add call notes, document status, or conversion blockers" />
                  <Button type="button" variant="outline" onClick={() => void updateLead(selected.id, { note })} disabled={!note.trim()}>Add note</Button>
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Select a lead to manage onboarding.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = "primary" }: { label: string; value: number; icon: typeof UserPlus; tone?: "primary" | "amber" | "blue" | "green" }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
        </div>
        <span className={cn("grid size-11 place-items-center rounded-xl", tone === "amber" ? "bg-amber-500/10 text-amber-600" : tone === "blue" ? "bg-blue-500/10 text-blue-600" : tone === "green" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary")}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const variant = status === "Approved" || status === "Onboarded" ? "success" : status === "Rejected" ? "destructive" : status === "New" ? "warning" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
