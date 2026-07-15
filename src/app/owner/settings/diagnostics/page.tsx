"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Monitoring = {
  context: Record<string, unknown>;
  alerts: Array<{ id: string; severity: string; title: string; detail: string }>;
  errors: Array<Record<string, unknown>>;
  logs: Array<Record<string, unknown>>;
  summary: Record<string, number>;
};

type Diagnostics = Record<string, unknown> & {
  productionMonitoring?: Monitoring;
  operationalDiagnostics?: Record<string, unknown>;
};

export default function OwnerSystemDiagnosticsPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/owner/system-diagnostics", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { data?: Diagnostics; error?: string };
      if (!response.ok) throw new Error(payload.error || "Diagnostics could not be loaded.");
      setData(payload.data ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Diagnostics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, []);

  const monitor = data?.productionMonitoring;
  const recentErrors = useMemo(() => monitor?.errors.slice(0, 5) ?? [], [monitor?.errors]);
  const rows = data ? [
    ["System Status", monitor?.context.applicationStatus],
    ["Restaurant", data.restaurant],
    ["Live Orders", data.ordersCount],
    ["Kitchen Load", data.kitchenCount],
    ["Waiter Load", data.waiterLoad],
    ["Queue Status", `${monitor?.context.pendingQueue ?? 0} pending / ${data.notificationQueueCount ?? 0} notifications`],
    ["Printer Status", data.printerStatus],
    ["Realtime Status", monitor?.context.realtimeStatus],
    ["Recent Notifications", data.notificationQueueCount],
    ["Recent Deployments", `${data.buildVersion} / ${data.commitSha}`],
    ["Revenue", formatCurrency(Number(data.revenue ?? 0))],
    ["Firestore", data.firestoreStatus],
  ] : [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="System Diagnostics"
        description="Operational health for this restaurant."
        action={<Button type="button" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" />Refresh</Button>}
      />

      {error ? <Card><CardContent className="flex items-center gap-3 p-5 text-sm font-semibold text-destructive"><AlertTriangle className="size-5" />{error}</CardContent></Card> : null}
      {loading && !data ? <Card><CardContent className="flex items-center gap-3 p-5 text-sm font-semibold text-muted-foreground"><Activity className="size-5 animate-pulse" />Loading canonical diagnostics...</CardContent></Card> : null}

      {monitor?.alerts.length ? (
        <section className="grid gap-3 xl:grid-cols-2">
          {monitor.alerts.map((alert) => (
            <Card key={alert.id} className={alert.severity === "critical" ? "border-destructive/40" : "border-warning/40"}>
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className={alert.severity === "critical" ? "mt-0.5 size-5 text-destructive" : "mt-0.5 size-5 text-warning"} />
                <div>
                  <p className="font-black">{alert.title}</p>
                  <p className="text-sm font-semibold text-muted-foreground">{alert.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map(([label, value]) => <StatusTile key={String(label)} label={String(label)} value={text(value)} />)}
            </CardContent>
          </Card>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentErrors.length ? recentErrors.map((entry) => (
                  <div key={text(entry.id)} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{text(entry.category || entry.event)}</p>
                      <Badge variant={text(entry.severity) === "critical" ? "destructive" : "warning"}>{text(entry.severity)}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">{text(entry.message)}</p>
                  </div>
                )) : <p className="text-sm font-semibold text-muted-foreground">No grouped errors recorded for this restaurant.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provider Status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Provider label="SMTP" ready={monitor?.context.smtpStatus === "configured"} value={text(monitor?.context.smtpStatus)} />
                <Provider label="Cloudinary" ready={monitor?.context.cloudinaryStatus === "configured"} value={text(monitor?.context.cloudinaryStatus)} />
                <Provider label="Payments" ready={["configured", "owner_scoped_or_missing"].includes(text(monitor?.context.razorpayStatus))} value={text(monitor?.context.razorpayStatus)} />
                <Provider label="Push" ready={monitor?.context.pushConfigured === true} value={monitor?.context.pushConfigured ? "configured" : "missing"} />
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-black">{value}</p>
    </div>
  );
}

function Provider({ label, ready, value }: { label: string; ready: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="font-black">{label}</p>
        <p className="text-xs font-semibold text-muted-foreground">{value}</p>
      </div>
      {ready ? <CheckCircle2 className="size-5 text-success" /> : <AlertTriangle className="size-5 text-warning" />}
    </div>
  );
}

function text(value: unknown) {
  if (value === undefined || value === null || value === "") return "not checked";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
