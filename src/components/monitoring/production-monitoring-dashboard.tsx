"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Download, RefreshCw, Search, XCircle } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Severity = "info" | "warning" | "error" | "critical";
type Monitor = {
  generatedAt: string;
  context: Record<string, unknown>;
  summary: Record<string, number>;
  alerts: Array<{ id: string; severity: Severity; title: string; detail: string }>;
  errors: Array<Record<string, unknown>>;
  logs: Array<Record<string, unknown>>;
  performance: {
    recent: Array<Record<string, unknown>>;
    slowApi: Array<Record<string, unknown>>;
    slowRenders: Array<Record<string, unknown>>;
    webVitals: Array<Record<string, unknown>>;
    fps: Record<string, unknown> | null;
    hydrationTime: Record<string, unknown> | null;
    pageLoad: Record<string, unknown> | null;
    realtimeLatency: Record<string, unknown> | null;
    sseStatus: string;
    memory?: Record<string, unknown>;
    cpu?: Record<string, unknown>;
    largestBundles: {
      checks: Array<{ name?: string; status?: string; detail?: string }>;
      sections: Array<{ title?: string; body?: string }>;
    };
  };
  selfTest: Array<{ name: string; status: "pass" | "fail"; detail: string }>;
};

type ApiPayload = {
  data?: {
    productionMonitoring?: Monitor;
    operationalDiagnostics?: Record<string, unknown>;
  };
  error?: string;
};

export function ProductionMonitoringDashboard() {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [ops, setOps] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function load(showLoading = true) {
    if (showLoading) {
      setLoading(true);
      setError("");
    }
    try {
      const response = await fetch("/api/admin/system-diagnostics", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as ApiPayload;
      if (!response.ok) throw new Error(payload.error || "Monitoring request failed.");
      setMonitor(payload.data?.productionMonitoring ?? null);
      setOps(payload.data?.operationalDiagnostics ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Monitoring request failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(false), 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const filteredLogs = useMemo(() => filterEntries(monitor?.logs ?? [], query), [monitor?.logs, query]);
  const filteredErrors = useMemo(() => filterEntries(monitor?.errors ?? [], query), [monitor?.errors, query]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Production Monitoring"
        description="Internal health, operations, performance, errors, logs, and self-tests."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="size-4" />Refresh
            </Button>
            <Button type="button" variant="outline" onClick={() => exportJson(monitor)} disabled={!monitor}>
              <Download className="size-4" />Export
            </Button>
          </div>
        }
      />

      {error ? <Banner severity="critical" title={error} detail="Diagnostics API did not return monitoring data." /> : null}
      {loading ? <Card><CardContent className="flex items-center gap-3 p-5 text-sm font-semibold text-muted-foreground"><Activity className="size-5 animate-pulse" />Loading production monitoring...</CardContent></Card> : null}

      {monitor ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Metric label="Application" value={text(monitor.context.applicationStatus)} ok={monitor.context.applicationStatus === "ok"} />
            <Metric label="Environment" value={text(monitor.context.deploymentEnvironment)} ok={monitor.context.deploymentEnvironment === "production"} />
            <Metric label="Firestore" value={text(monitor.context.firestoreStatus)} ok={monitor.context.firestoreStatus === "connected"} />
            <Metric label="Alerts" value={String(monitor.alerts.length)} ok={monitor.alerts.length === 0} />
            <Metric label="Errors" value={String(monitor.summary.errors ?? 0)} ok={(monitor.summary.criticalErrors ?? 0) === 0} />
            <Metric label="Slow API" value={String(monitor.summary.slowApi ?? 0)} ok={(monitor.summary.slowApi ?? 0) === 0} />
          </section>

          {monitor.alerts.length ? (
            <section className="grid gap-3 xl:grid-cols-2">
              {monitor.alerts.map((alert) => <Banner key={alert.id} severity={alert.severity} title={alert.title} detail={alert.detail} />)}
            </section>
          ) : null}

          <Tabs defaultValue="health" className="space-y-4">
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="ops">Operations</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="self-test">Self-test</TabsTrigger>
            </TabsList>

            <TabsContent value="health">
              <CardGrid entries={[
                ["Application", monitor.context.applicationStatus],
                ["Database", monitor.context.firestoreStatus],
                ["Firestore", monitor.context.firestoreStatus],
                ["Storage", monitor.context.storageStatus],
                ["SMTP", monitor.context.smtpStatus],
                ["Cloudinary", monitor.context.cloudinaryStatus],
                ["Google OAuth", bool(monitor.context.googleOAuthConfigured)],
                ["Mapbox", bool(monitor.context.mapboxConfigured)],
                ["Razorpay", monitor.context.razorpayStatus],
                ["Push", bool(monitor.context.pushConfigured)],
                ["WhatsApp", bool(monitor.context.whatsappConfigured)],
                ["SMS", bool(monitor.context.smsConfigured)],
                ["Build Version", monitor.context.applicationVersion],
                ["Commit SHA", monitor.context.commitSha],
                ["Node Version", monitor.context.nodeVersion],
                ["Response Time", `${monitor.context.responseTimeMs} ms`],
                ["API Health", monitor.context.applicationStatus],
                ["Realtime", monitor.context.realtimeStatus],
                ["Queue", `${monitor.context.pendingQueue ?? 0} pending`],
                ["Background Jobs", monitor.context.backgroundJobsStatus],
              ]} />
            </TabsContent>

            <TabsContent value="ops">
              <CardGrid entries={[
                ["Orders", monitor.context.openOrders],
                ["Kitchen", monitor.context.kitchenLoad],
                ["POS", readNested(ops, "posQueue.drafts")],
                ["Customers", readNested(ops, "tenantCount")],
                ["Payments", monitor.context.razorpayStatus],
                ["Notifications", monitor.context.notificationQueue],
                ["Errors", monitor.summary.errors],
                ["Performance", `${monitor.summary.slowApi ?? 0} slow API`],
                ["Providers", `${monitor.selfTest.filter((item) => item.status === "pass").length}/${monitor.selfTest.length} pass`],
                ["Deployments", monitor.context.commitSha],
                ["System Health", monitor.context.applicationStatus],
              ]} />
            </TabsContent>

            <TabsContent value="performance">
              <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <CardGrid entries={[
                  ["FPS", metricValue(monitor.performance.fps)],
                  ["Memory", memoryText(monitor.performance.memory)],
                  ["CPU estimate", cpuText(monitor.performance.cpu)],
                  ["Slow renders", monitor.performance.slowRenders.length],
                  ["Slow API", monitor.performance.slowApi.length],
                  ["Slow Firestore queries", readNested(ops, "slowQueryDetection.observedMs") ? `${readNested(ops, "slowQueryDetection.observedMs")} ms` : "not checked"],
                  ["Hydration time", metricValue(monitor.performance.hydrationTime)],
                  ["Page load", metricValue(monitor.performance.pageLoad)],
                  ["Realtime latency", metricValue(monitor.performance.realtimeLatency) || "not checked"],
                  ["WebSocket/SSE", monitor.performance.sseStatus],
                ]} />
                <Card>
                  <CardHeader>
                    <CardTitle>Largest bundles</CardTitle>
                    <CardDescription>Generated analyzer evidence</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {monitor.performance.largestBundles.checks.map((check) => (
                      <StatusRow key={check.name} label={check.name || "bundle"} value={check.detail || ""} ok={check.status === "PASS"} />
                    ))}
                    {monitor.performance.largestBundles.sections.map((section) => (
                      <pre key={section.title} className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">{section.body}</pre>
                    ))}
                  </CardContent>
                </Card>
              </section>
            </TabsContent>

            <TabsContent value="errors">
              <SearchBox query={query} onQuery={setQuery} />
              <EntryList entries={filteredErrors} empty="No grouped errors recorded." />
            </TabsContent>

            <TabsContent value="logs">
              <SearchBox query={query} onQuery={setQuery} />
              <EntryList entries={filteredLogs} empty="No logs recorded in this process." />
            </TabsContent>

            <TabsContent value="self-test">
              <Card>
                <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {monitor.selfTest.map((item) => <StatusRow key={item.name} label={item.name} value={item.detail} ok={item.status === "pass"} />)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-black">{value}</p>
        </div>
        {ok ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <AlertTriangle className="size-5 shrink-0 text-warning" />}
      </CardContent>
    </Card>
  );
}

function Banner({ severity, title, detail }: { severity: Severity; title: string; detail: string }) {
  return (
    <Card className={severity === "critical" ? "border-destructive/40" : "border-warning/40"}>
      <CardContent className="flex items-start gap-3 p-4">
        <AlertTriangle className={severity === "critical" ? "mt-0.5 size-5 text-destructive" : "mt-0.5 size-5 text-warning"} />
        <div>
          <p className="font-black">{title}</p>
          <p className="text-sm font-semibold text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CardGrid({ entries }: { entries: Array<[string, unknown]> }) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        {entries.map(([label, value]) => <StatusTile key={label} label={label} value={text(value)} />)}
      </CardContent>
    </Card>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-background/50 p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-md border bg-background/50 p-3">
      <div className="min-w-0">
        <p className="font-black">{label}</p>
        <p className="break-words text-xs font-semibold text-muted-foreground">{value}</p>
      </div>
      <Badge variant={ok ? "success" : "warning"}>{ok ? "PASS" : "FAIL"}</Badge>
    </div>
  );
}

function SearchBox({ query, onQuery }: { query: string; onQuery: (value: string) => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Search className="size-4 text-muted-foreground" />
      <Input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Filter date, severity, module, user, order, restaurant, provider, API, error" />
    </div>
  );
}

function EntryList({ entries, empty }: { entries: Array<Record<string, unknown>>; empty: string }) {
  if (!entries.length) return <Card><CardContent className="p-5 text-sm font-semibold text-muted-foreground">{empty}</CardContent></Card>;
  return (
    <div className="grid gap-3">
      {entries.map((entry) => (
        <Card key={text(entry.id)}>
          <CardContent className="grid gap-3 p-4 xl:grid-cols-[12rem_1fr_8rem]">
            <div>
              <Badge variant={severityVariant(text(entry.severity))}>{text(entry.severity || entry.level)}</Badge>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">{text(entry.timestamp || entry.lastSeen)}</p>
            </div>
            <div className="min-w-0">
              <p className="break-words font-black">{text(entry.event || entry.category)}</p>
              <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">{text(entry.message || entry.path || entry.api)}</p>
              <p className="mt-2 break-words text-xs text-muted-foreground">{["module", "provider", "userId", "orderId", "restaurantId", "api"].map((key) => `${key}:${text(entry[key])}`).join("  ")}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              {Number(entry.count ?? 0) > 1 ? <Badge variant="secondary">x{Number(entry.count)}</Badge> : null}
              {text(entry.severity) === "critical" ? <XCircle className="size-5 text-destructive" /> : <CheckCircle2 className="size-5 text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function filterEntries(entries: Array<Record<string, unknown>>, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(needle));
}

function exportJson(monitor: Monitor | null) {
  if (!monitor) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(monitor, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `production-monitoring-${new Date().toISOString().replaceAll(":", "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function severityVariant(value: string) {
  if (value === "critical" || value === "error") return "destructive";
  if (value === "warning") return "warning";
  return "secondary";
}

function metricValue(entry: Record<string, unknown> | null) {
  if (!entry) return "";
  const value = entry.metricValue ?? entry.durationMs;
  return value === undefined ? "" : `${value}`;
}

function memoryText(memory?: Record<string, unknown>) {
  if (!memory) return "not checked";
  return `${memory.heapUsedMb ?? "?"}/${memory.heapTotalMb ?? "?"} MB heap`;
}

function cpuText(cpu?: Record<string, unknown>) {
  if (!cpu) return "not checked";
  const load = Array.isArray(cpu.loadAverage) ? cpu.loadAverage[0] : "?";
  return `${load}/${cpu.availableParallelism ?? "?"}`;
}

function readNested(input: Record<string, unknown> | null, path: string) {
  let current: unknown = input;
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function bool(value: unknown) {
  return value ? "configured" : "missing";
}

function text(value: unknown) {
  if (value === undefined || value === null || value === "") return "not checked";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
