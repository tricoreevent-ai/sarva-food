"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, DatabaseZap, Download, HardDrive, RefreshCw, ShieldCheck } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  runFirebaseDiagnostics,
  type FirebaseDiagnosticItem,
  type FirebaseDiagnostics,
} from "@/services/firebase-diagnostics-service";
import { initializeFirestoreBaseline } from "@/services/firestore-init-service";

export default function FirebaseDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<FirebaseDiagnostics | null>(null);
  const [status, setStatus] = useState("Ready");

  async function refresh() {
    setStatus("Running diagnostics...");
    const result = await runFirebaseDiagnostics();
    setDiagnostics(result);
    setStatus("Diagnostics refreshed");
  }

  async function seed() {
    setStatus("Initializing Firestore seed data...");
    const result = await initializeFirestoreBaseline();
    setStatus(result.message);
    await refresh();
  }

  useEffect(() => {
    let active = true;
    runFirebaseDiagnostics().then((result) => {
      if (!active) return;
      setDiagnostics(result);
      setStatus("Diagnostics loaded");
    });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const all = [...(diagnostics?.items ?? []), ...(diagnostics?.collections ?? [])];
    const documentCount = (diagnostics?.collections ?? []).reduce((sum, item) => sum + (item.metric ?? 0), 0);
    const estimatedReads = all.length + documentCount;
    return {
      pass: all.filter((item) => item.status === "pass").length,
      warn: all.filter((item) => item.status === "warn").length,
      fail: all.filter((item) => item.status === "fail").length,
      documentCount,
      estimatedReads,
      estimatedCost: Math.max(0.01, estimatedReads * 0.0000006),
    };
  }, [diagnostics]);

  const columns: Array<AdvancedColumn<FirebaseDiagnosticItem>> = [
    { key: "label", label: "Check", sortable: true, searchable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item) => <Badge variant={item.status === "pass" ? "success" : item.status === "warn" ? "warning" : "destructive"}>{item.status}</Badge>,
    },
    { key: "detail", label: "Detail", searchable: true },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Firebase diagnostics"
        description="Production startup checks for Auth, Firestore, Storage, indexes, rules symptoms, and required collection health."
        action={<Badge variant={totals.fail ? "destructive" : totals.warn ? "warning" : "success"}>{totals.fail ? "Attention" : totals.warn ? "Warnings" : "Healthy"}</Badge>}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Metric icon={<ShieldCheck className="size-4" />} label="Passed" value={totals.pass} tone="success" />
        <Metric icon={<Activity className="size-4" />} label="Warnings" value={totals.warn} tone="warning" />
        <Metric icon={<Activity className="size-4" />} label="Failures" value={totals.fail} tone="destructive" />
        <Metric icon={<HardDrive className="size-4" />} label="Documents" value={totals.documentCount} tone="success" />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <InfoCard label="Read usage estimate" value={totals.estimatedReads.toLocaleString("en-IN")} detail="Diagnostics reads plus sampled collection counts." />
        <InfoCard label="Cost estimate" value={`$${totals.estimatedCost.toFixed(4)}`} detail="Approximate diagnostic read cost only." />
        <InfoCard label="Storage usage" value={formatBytes(totals.documentCount * 2048)} detail="Estimated from sampled document count." />
        <Card>
          <CardContent className="flex h-full flex-col justify-center gap-2 p-4">
            <Button onClick={() => void refresh()}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => createBackup(diagnostics)}>
              <Download className="size-4" />
              Create Backup
            </Button>
            <Button variant="outline" onClick={() => void seed()}>
              <DatabaseZap className="size-4" />
              Seed Firestore
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black">Platform checks</h2>
            <Badge variant="muted">{status}</Badge>
          </div>
          <AdvancedDataTable
            title="Platform checks"
            rows={diagnostics?.items ?? []}
            columns={columns}
            pageSize={8}
            exportFilename="firebase-platform-diagnostics.csv"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-lg font-black">Collection health</h2>
          <AdvancedDataTable
            title="Collection health"
            rows={diagnostics?.collections ?? []}
            columns={columns}
            pageSize={12}
            exportFilename="firebase-collection-health.csv"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "success" | "warning" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-muted-foreground">{label}</span>
          <Badge variant={tone}>{icon}</Badge>
        </div>
        <p className="text-3xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

function createBackup(diagnostics: FirebaseDiagnostics | null) {
  const payload = {
    generatedAt: new Date().toISOString(),
    diagnostics,
    collections: diagnostics?.collections ?? [],
    checks: diagnostics?.items ?? [],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `firebase-diagnostics-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
