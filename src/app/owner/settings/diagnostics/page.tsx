"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Diagnostics = Record<string, string | number>;

export default function OwnerSystemDiagnosticsPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/owner/system-diagnostics", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { data?: Diagnostics; error?: string };
        if (!response.ok) throw new Error(payload.error || "Diagnostics could not be loaded.");
        setData(payload.data ?? null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Diagnostics could not be loaded.");
      });
    return () => controller.abort();
  }, []);
  const rows = data ? [
    ["Restaurant", data.restaurant], ["Tenant", data.tenant], ["Firebase project", data.firebaseProject], ["Environment", data.environment], ["Build version", data.buildVersion], ["Commit SHA", data.commitSha], ["Firestore", data.firestoreStatus], ["Realtime listener status", data.listenerStatus],
    ["Orders", data.ordersCount], ["Customers", data.customersCount], ["Loyalty accounts", data.loyaltyCount], ["Offers", data.offersCount], ["Menu", data.menuCount], ["Tables", data.tablesCount], ["Staff", data.staffCount], ["Canonical revenue", formatCurrency(Number(data.revenue ?? 0))],
  ] : [];
  return <div className="space-y-6"><SectionHeader title="System Diagnostics" description="Canonical Firestore counts and deployment identity for this restaurant." />{error ? <Card><CardContent className="p-5 text-sm font-semibold text-destructive">{error}</CardContent></Card> : null}{data ? <Card><CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{rows.map(([label, value]) => <div key={String(label)} className="rounded-lg border p-3"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 break-all font-black">{value}</p></div>)}</CardContent></Card> : !error ? <Card><CardContent className="flex items-center gap-3 p-5 text-sm font-semibold text-muted-foreground"><Activity className="size-5 animate-pulse" />Loading canonical diagnostics...</CardContent></Card> : null}</div>;
}
