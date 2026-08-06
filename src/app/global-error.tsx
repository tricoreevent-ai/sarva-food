"use client";

import { useEffect } from "react";
import { captureException } from "@/services/analytics-service";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const errorId = error.digest ? `FG-${error.digest.slice(0, 10).toUpperCase()}` : "FG-ROOT";
  useEffect(() => { void captureException(error, { surface: "root-boundary", digest: error.digest }); }, [error]);
  return <html lang="en"><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: 16 }}><section role="alert" style={{ width: "100%", maxWidth: 440, border: "1px solid #e2e8f0", borderRadius: 16, background: "white", padding: 24, textAlign: "center" }}><p style={{ color: "#b91c1c", fontWeight: 800 }}>Food Gedi recovered safely</p><h1 style={{ marginTop: 8, fontSize: 24 }}>The application needs a retry</h1><p style={{ color: "#475569" }}>Your cart and submitted data remain protected. Retry now; if this repeats, share the support ID below.</p><p style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Support ID: {errorId}</p><button type="button" onClick={reset} style={{ minHeight: 44, marginTop: 16, border: 0, borderRadius: 10, background: "#166534", color: "white", padding: "10px 20px", fontWeight: 800 }}>Retry application</button></section></main></body></html>;
}
