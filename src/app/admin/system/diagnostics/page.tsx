"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DiagnosticsPayload = {
  firebaseProjectId: string;
  publicFirebaseProjectId?: string;
  activeEnvironment: string;
  cmsVersion: string;
  lastSync: string;
  missingFields: string[];
  missingCollections: string[];
  collectionChecks: Array<{ collectionName: string; exists: boolean; latencyMs: number; error?: string }>;
  firestoreLatencyMs: number;
  firebaseAdminConfigured: boolean;
  cloudinaryConfigured: boolean;
  smtpConfigured: boolean;
  googleOAuthConfigured: boolean;
  buildVersion: string;
  deploymentTimestamp: string;
};

export default function AdminSystemDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDiagnostics(showLoading = true) {
    if (showLoading) {
      setLoading(true);
      setError("");
    }
    try {
      const response = await fetch("/api/admin/system-diagnostics", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Diagnostics request failed.");
      setData(payload.data as DiagnosticsPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Diagnostics request failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadDiagnostics(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="System Diagnostics"
        description="Validate Firebase, CMS schema, deployment metadata, and production configuration drift."
        action={<Button type="button" variant="outline" onClick={() => void loadDiagnostics()} disabled={loading}><RefreshCw className="size-4" />Refresh</Button>}
      />

      {error ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-5 text-red-200">
            <AlertTriangle className="size-5" />
            <p className="font-semibold">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-muted-foreground shadow-sm">Checking environment...</div> : null}

      {data ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric title="Firebase project" value={data.firebaseProjectId} ok={Boolean(data.firebaseProjectId && data.firebaseProjectId !== "not configured")} />
            <Metric title="Environment" value={data.activeEnvironment} ok={data.activeEnvironment === "production"} />
            <Metric title="CMS version" value={data.cmsVersion} ok={data.missingFields.length === 0} />
            <Metric title="Firestore latency" value={`${data.firestoreLatencyMs} ms`} ok={data.firestoreLatencyMs < 800} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_24rem]">
            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="flex items-center gap-2 text-xl font-black"><Database className="size-5 text-emerald-700" />Collection checks</h2>
                <div className="grid gap-2">
                  {data.collectionChecks.map((check) => (
                    <div key={check.collectionName} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div>
                        <p className="font-black">{check.collectionName}</p>
                        <p className="text-xs font-semibold text-slate-500">{check.error || `${check.latencyMs} ms`}</p>
                      </div>
                      <Badge variant={check.exists ? "success" : "warning"}>{check.exists ? "Found" : "Missing or empty"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="flex items-center gap-2 text-xl font-black"><ShieldCheck className="size-5 text-violet-700" />Configuration</h2>
                <StatusLine label="Firebase Admin" ok={data.firebaseAdminConfigured} />
                <StatusLine label="Cloudinary" ok={data.cloudinaryConfigured} />
                <StatusLine label="SMTP" ok={data.smtpConfigured} />
                <StatusLine label="Google OAuth" ok={data.googleOAuthConfigured} />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-black">Last CMS sync</p>
                  <p className="mt-1 break-all text-slate-600">{data.lastSync}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-black">Build</p>
                  <p className="mt-1 break-all text-slate-600">{data.buildVersion}</p>
                  <p className="mt-1 break-all text-slate-600">{data.deploymentTimestamp}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {data.missingFields.length || data.missingCollections.length ? (
            <Card>
              <CardContent className="space-y-3 p-5">
                <h2 className="text-xl font-black text-orange-700">Action needed</h2>
                {data.missingFields.length ? <p className="text-sm font-semibold text-slate-600">Missing CMS fields: {data.missingFields.join(", ")}</p> : null}
                {data.missingCollections.length ? <p className="text-sm font-semibold text-slate-600">Missing or empty collections: {data.missingCollections.join(", ")}</p> : null}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Metric({ title, value, ok }: { title: string; value: string; ok: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted-foreground">{title}</p>
          <p className="mt-2 truncate text-xl font-black">{value}</p>
        </div>
        {ok ? <CheckCircle2 className="size-5 shrink-0 text-emerald-700" /> : <AlertTriangle className="size-5 shrink-0 text-orange-600" />}
      </CardContent>
    </Card>
  );
}

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="font-semibold">{label}</span>
      <Badge variant={ok ? "success" : "warning"}>{ok ? "Ready" : "Missing"}</Badge>
    </div>
  );
}
