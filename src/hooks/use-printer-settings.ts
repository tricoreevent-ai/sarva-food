"use client";

import { useCallback, useEffect, useState } from "react";
import type { OwnerBusinessProfile, PrinterSettings, PrintLog, RestaurantBranch, TableOrder, TaxSettings } from "@/lib/types";

const defaults: PrinterSettings = {
  kitchenPrinterName: "",
  billingPrinterName: "",
  autoPrintOrders: false,
  compactTickets: true,
  connectionStatus: "browser-preview",
  profiles: [],
  templates: [],
  printLogs: [],
};

type PrinterContext = {
  profile: OwnerBusinessProfile | null;
  branch: RestaurantBranch | null;
  taxSettings: TaxSettings | null;
  latestOrder: TableOrder | null;
};

const emptyContext: PrinterContext = { profile: null, branch: null, taxSettings: null, latestOrder: null };

export function usePrinterSettings(surface?: "kitchen") {
  const [settings, setSettings] = useState(defaults);
  const [context, setContext] = useState<PrinterContext>(emptyContext);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/owner/printers${surface ? `?surface=${surface}` : ""}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as { data?: PrinterSettings; context?: PrinterContext };
    if (response.ok && payload.data) setSettings(payload.data);
    if (response.ok && payload.context) setContext(payload.context);
    setLoading(false);
  }, [surface]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const save = useCallback(async (next: PrinterSettings) => {
    setSettings(next);
    const response = await fetch("/api/owner/printers", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: next, surface }),
    });
    const payload = await response.json().catch(() => ({})) as { data?: PrinterSettings };
    if (response.ok && payload.data) setSettings(payload.data);
  }, [surface]);

  const log = useCallback(async (entry: Omit<PrintLog, "id" | "timestamp">) => {
    await fetch("/api/owner/printers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ log: entry, surface }) });
    await refresh();
  }, [refresh, surface]);

  return { settings, context, loading, save, log, refresh };
}
