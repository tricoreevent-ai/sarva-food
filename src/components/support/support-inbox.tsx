"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/client-toast";
import { AlertTriangle, CheckCircle2, Clock3, Inbox, RefreshCw, Search, Send } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Scope = "customer" | "owner" | "admin";
type IssueStatus = "open" | "waiting_owner" | "waiting_admin" | "waiting_customer" | "resolved" | "closed";
type IssueTarget = "owner" | "admin" | "both";
type IssueMessage = {
  id: string;
  body: string;
  actor: "customer" | "owner" | "admin" | "system";
  authorName?: string;
  createdAt?: string;
  internal?: boolean;
};
type SupportIssue = {
  id: string;
  restaurantName?: string;
  restaurantSlug?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  subject?: string;
  category?: string;
  priority?: string;
  status: IssueStatus;
  target: IssueTarget;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
  messages: IssueMessage[];
};

const endpoints = {
  customer: "/api/public/support-issues",
  owner: "/api/owner/support-issues",
  admin: "/api/admin/support-issues",
} satisfies Record<Scope, string>;
const statuses: IssueStatus[] = ["open", "waiting_owner", "waiting_admin", "waiting_customer", "resolved", "closed"];
const targets: IssueTarget[] = ["owner", "admin", "both"];

export function SupportInbox({ scope }: { scope: Scope }) {
  const [issues, setIssues] = useState<SupportIssue[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<IssueStatus | "all">("all");
  const [reply, setReply] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(true);
  const selected = issues.find((issue) => issue.id === selectedId) ?? issues[0];
  const canManage = scope !== "customer";

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return issues.filter((issue) => {
      if (status !== "all" && issue.status !== status) return false;
      if (!term) return true;
      return `${issue.restaurantName} ${issue.customerName} ${issue.customerEmail} ${issue.subject} ${issue.orderId} ${issue.category}`.toLowerCase().includes(term);
    });
  }, [issues, query, status]);

  const stats = useMemo(() => ({
    total: issues.length,
    open: issues.filter((issue) => !["resolved", "closed"].includes(issue.status)).length,
    waiting: issues.filter((issue) => issue.status === "waiting_customer").length,
    resolved: issues.filter((issue) => issue.status === "resolved" || issue.status === "closed").length,
  }), [issues]);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(endpoints[scope], { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load inbox.");
      const nextIssues = Array.isArray(payload.data) ? payload.data : [];
      setIssues(nextIssues);
      setSelectedId((current) => current || nextIssues[0]?.id || "");
      setAssignedTo((current) => current || nextIssues[0]?.assignedTo || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load inbox.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  async function updateIssue(issueId: string, patch: Record<string, string>) {
    const response = await fetch(endpoints[scope], {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ issueId, ...patch }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not update issue.");
    toast.success(patch.message ? "Reply sent." : "Issue updated.");
    setReply("");
    await loadIssues();
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadIssues();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadIssues]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title={scope === "customer" ? "Support Inbox" : scope === "owner" ? "Restaurant Inbox" : "Support Command Center"}
        description={scope === "customer" ? "Track replies from restaurants and Nammude support." : "Handle customer issues, replies, escalation, and closure from one queue."}
        action={<Button onClick={() => void loadIssues()} disabled={loading}><RefreshCw className="size-4" />Refresh</Button>}
      />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Total" value={stats.total} icon={Inbox} />
        <Metric label="Active" value={stats.open} icon={AlertTriangle} tone="amber" />
        <Metric label="Waiting customer" value={stats.waiting} icon={Clock3} tone="blue" />
        <Metric label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="green" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-2 md:grid-cols-[1fr_180px]">
              <div className="flex items-center gap-2 rounded-xl border bg-background px-3">
                <Search className="size-4 text-muted-foreground" />
                <Input id={`${scope}-support-search`} name={`${scope}SupportSearch`} className="border-0 shadow-none focus-visible:ring-0" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, restaurant, order, subject" />
              </div>
              <select id={`${scope}-support-status`} name={`${scope}SupportStatus`} className="h-11 rounded-xl border bg-background px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value as IssueStatus | "all")}>
                <option value="all">All status</option>
                {statuses.map((item) => <option key={item} value={item}>{labelStatus(item)}</option>)}
              </select>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-[1.3fr_1fr_130px] gap-3 border-b bg-muted/60 px-4 py-3 text-xs font-black uppercase text-muted-foreground">
                <span>Issue</span><span>{scope === "customer" ? "Restaurant" : "Customer"}</span><span>Status</span>
              </div>
              {loading ? <p className="p-5 text-sm font-semibold text-muted-foreground">Loading inbox...</p> : null}
              {!loading && !filtered.length ? <p className="p-5 text-sm font-semibold text-muted-foreground">No support issues found.</p> : null}
              {filtered.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  className={cn("grid w-full grid-cols-[1.3fr_1fr_130px] gap-3 border-b px-4 py-3 text-left text-sm hover:bg-muted/40", selected?.id === issue.id && "bg-primary/5")}
                  onClick={() => {
                    setSelectedId(issue.id);
                    setAssignedTo(issue.assignedTo ?? "");
                  }}
                >
                  <span><b className="line-clamp-1">{issue.subject}</b><small className="mt-1 block text-muted-foreground">{issue.category} · {issue.priority || "normal"}</small></span>
                  <span><b className="line-clamp-1">{scope === "customer" ? issue.restaurantName : issue.customerName || "Customer"}</b><small className="mt-1 block text-muted-foreground">{issue.orderId || issue.customerEmail || issue.restaurantSlug}</small></span>
                  <span><StatusBadge status={issue.status} /></span>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">{selected.subject}</h2>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{selected.restaurantName} · {selected.category} · {selected.priority || "normal"}</p>
                </div>

                <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                  <p><b>Customer:</b> {selected.customerName || "Not shared"}</p>
                  {selected.customerEmail ? <p><b>Email:</b> {selected.customerEmail}</p> : null}
                  {selected.customerPhone ? <p><b>Phone:</b> {selected.customerPhone}</p> : null}
                  {selected.orderId ? <p><b>Order:</b> {selected.orderId}</p> : null}
                  <p><b>Route:</b> {selected.target}</p>
                </div>

                {canManage ? (
                  <div className="grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs font-black uppercase text-muted-foreground">
                        Status
                        <select id={`${scope}-issue-status`} name={`${scope}IssueStatus`} className="h-10 rounded-lg border bg-background px-3 text-sm font-bold normal-case text-foreground" value={selected.status} onChange={(event) => void updateIssue(selected.id, { status: event.target.value })}>
                          {statuses.map((item) => <option key={item} value={item}>{labelStatus(item)}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-muted-foreground">
                        Route
                        <select id={`${scope}-issue-target`} name={`${scope}IssueTarget`} className="h-10 rounded-lg border bg-background px-3 text-sm font-bold normal-case text-foreground" value={selected.target} onChange={(event) => void updateIssue(selected.id, { target: event.target.value })}>
                          {targets.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Input id={`${scope}-issue-assignee`} name={`${scope}IssueAssignee`} value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Assign to team member" />
                      <Button type="button" variant="outline" onClick={() => void updateIssue(selected.id, { assignedTo })}>Assign</Button>
                    </div>
                  </div>
                ) : null}

                <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border bg-background p-3">
                  {selected.messages.map((message) => (
                    <div key={message.id} className={cn("rounded-xl p-3 text-sm", message.actor === "customer" ? "bg-muted" : "bg-primary/10")}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-black uppercase text-muted-foreground">
                        <span>{message.authorName || labelActor(message.actor)}</span>
                        <span>{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap font-semibold leading-6">{message.body}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2">
                  <label htmlFor={`${scope}-issue-reply`} className="text-xs font-black uppercase text-muted-foreground">Reply</label>
                  <Textarea id={`${scope}-issue-reply`} name={`${scope}IssueReply`} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a clear reply for the customer..." />
                  <Button type="button" onClick={() => void updateIssue(selected.id, { message: reply, status: canManage ? "waiting_customer" : "waiting_owner" })} disabled={!reply.trim()}>
                    <Send className="size-4" />
                    Send reply
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Select an issue to open the conversation.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = "primary" }: { label: string; value: number; icon: typeof Inbox; tone?: "primary" | "amber" | "blue" | "green" }) {
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

function StatusBadge({ status }: { status: IssueStatus }) {
  const variant = status === "resolved" || status === "closed" ? "success" : status === "waiting_customer" ? "secondary" : "warning";
  return <Badge variant={variant}>{labelStatus(status)}</Badge>;
}

function labelStatus(status: IssueStatus) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelActor(actor: IssueMessage["actor"]) {
  if (actor === "admin") return "Nammude support";
  if (actor === "owner") return "Restaurant team";
  return "Customer";
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
