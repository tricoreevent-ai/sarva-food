"use client";

import { useEffect, useState } from "react";
import { Database, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { runFirebaseDiagnostics, type FirebaseDiagnostics } from "@/services/firebase-diagnostics-service";
import { shouldUseFirebase } from "@/lib/env";

export function FirebaseStartupStatus() {
  const [diagnostics, setDiagnostics] = useState<FirebaseDiagnostics | null>(null);

  useEffect(() => {
    if (!shouldUseFirebase()) return;
    let active = true;
    runFirebaseDiagnostics({ scope: "startup" })
      .then((result) => {
        if (active) setDiagnostics(result);
      })
      .catch(() => {
        if (active) {
          setDiagnostics({
            generatedAt: new Date().toISOString(),
            items: [{ label: "Startup check", status: "fail", detail: "Firebase diagnostics failed." }],
            collections: [],
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!diagnostics) return null;

  const failures = diagnostics.items.filter((item) => item.status === "fail").length;
  const warnings = diagnostics.items.filter((item) => item.status === "warn").length;

  if (!failures && !warnings) {
    return (
      <div className="mb-4 rounded-md border bg-card p-3 text-sm">
        <div className="flex items-center gap-2 font-bold">
          <Database className="size-4 text-primary" />
          Firebase connected
          <Badge variant="success">live</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 font-bold">
        <ShieldAlert className="size-4 text-warning" />
        Firebase startup checks need attention
        {failures ? <Badge variant="destructive">{failures} failed</Badge> : null}
        {warnings ? <Badge variant="warning">{warnings} warnings</Badge> : null}
      </div>
    </div>
  );
}
