import nextEnv from "@next/env";
import { appUrl, check, fetchJson, summarize, table, writeReport } from "./verification-utils.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });

const url = appUrl();
const minutes = Number(process.env.MEMORY_MONITOR_MINUTES || 0.05);
const sampleSeconds = Number(process.env.MEMORY_SAMPLE_SECONDS || 1);
const checks = [];
const samples = [];

if (!url) {
  checks.push(check("memory:url", "ERROR", "Set PRODUCTION_URL or NEXT_PUBLIC_APP_URL."));
} else {
  await monitor();
}

checks.push(check("browser:listeners", "MANUAL", "EventSource/WebSocket/Firestore listener and React mount counts require authenticated Chrome instrumentation."));
checks.push(check("browser:heap", "MANUAL", "Detached DOM and client heap require 30-minute authenticated browser session."));

const sections = [{
  title: "Samples",
  body: table(["Time", "Heap MB", "RSS MB", "Status"], samples.map((s) => [s.time, s.heapUsedMb, s.rssMb, s.status])),
}];
const { summary } = writeReport("MEMORY_STABILITY_REPORT", "Memory Stability Report", checks, sections);
console.log(`Memory stability: ${JSON.stringify(summary.counts)}`);
process.exit(summarize(checks).exitCode);

async function monitor() {
  const count = Math.max(1, Math.ceil((minutes * 60) / sampleSeconds));
  for (let i = 0; i < count; i += 1) {
    try {
      const result = await fetchJson(`${url}/health/ready`);
      const memory = result.json?.runtimeStatus?.memoryUsage ?? {};
      samples.push({ time: new Date().toISOString(), heapUsedMb: memory.heapUsedMb ?? "", rssMb: memory.rssMb ?? "", status: result.json?.status ?? `HTTP ${result.status}` });
      if (!result.ok) checks.push(check(`sample:${i + 1}`, "FAIL", `HTTP ${result.status}`));
    } catch (error) {
      checks.push(check(`sample:${i + 1}`, "FAIL", error instanceof Error ? error.message : String(error)));
    }
    if (i < count - 1) await new Promise((resolve) => setTimeout(resolve, sampleSeconds * 1000));
  }
  const first = Number(samples[0]?.heapUsedMb);
  const last = Number(samples.at(-1)?.heapUsedMb);
  const growth = Number.isFinite(first) && Number.isFinite(last) ? last - first : 0;
  checks.push(check("server:heap-growth", growth <= 64 ? "PASS" : "FAIL", `${growth.toFixed(2)} MB growth / budget 64 MB`));
}
