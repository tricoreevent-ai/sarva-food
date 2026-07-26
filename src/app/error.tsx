"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { captureException } from "@/services/analytics-service";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void captureException(error, { path: location.pathname, digest: error.digest });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-red-600">Screen could not be loaded</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Reload this screen</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">Your order and billing data are preserved. Retry the screen or open the previous page.</p>
        <Button className="mt-5" onClick={reset}>Retry</Button>
      </section>
    </main>
  );
}
