import nextEnv from "@next/env";
import { appUrl, check, fetchJson, summarize, writeReport } from "./verification-utils.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });

const url = appUrl();
const checks = [];
const publicPaths = ["/", "/restaurants", "/offers", "/api/release-info", "/health/live", "/health/ready", "/api/public/restaurants"];
const manual = ["Customer authentication", "Owner authentication", "Kitchen flow", "POS billing", "Admin", "QR ordering", "Table ordering", "Checkout", "Razorpay", "Offers", "Coupons", "Notifications", "Print", "Realtime updates", "Role switching", "Offline recovery", "Error boundaries", "Accessibility"];

if (!url) {
  checks.push(check("smoke:url", "ERROR", "Set PRODUCTION_URL or NEXT_PUBLIC_APP_URL."));
} else {
  for (const route of publicPaths) await smoke(route);
}
for (const item of manual) checks.push(check(`manual:${item}`, "MANUAL", "Requires authenticated browser/provider/hardware validation."));

const { summary } = writeReport("PRODUCTION_SMOKE_REPORT", "Production Smoke Report", checks);
console.log(`Production smoke: ${JSON.stringify(summary.counts)}`);
process.exit(summarize(checks).exitCode);

async function smoke(route) {
  try {
    const result = await fetchJson(`${url}${route}`);
    checks.push(check(`route:${route}`, result.status < 500 ? "PASS" : "FAIL", `HTTP ${result.status}`));
  } catch (error) {
    checks.push(check(`route:${route}`, "FAIL", error instanceof Error ? error.message : String(error)));
  }
}
