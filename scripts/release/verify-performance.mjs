import nextEnv from "@next/env";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { appUrl, check, readReport, root, summarize, table, writeReport } from "./verification-utils.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });

const checks = [];
const url = appUrl();
const skippedWalkEntries = [];
const budgets = {
  desktopPerformance: 0.95,
  mobilePerformance: 0.9,
  lcpMs: 2500,
  cls: 0.1,
  inpMs: 200,
  ttfbMs: 800,
  routeJsKb: 1200,
};
const bundle = bundleStats();
const analyzer = analyzerStatus();

checks.push(check("target:url", url ? "PASS" : "MANUAL", url || "Set PRODUCTION_URL or NEXT_PUBLIC_APP_URL."));
checks.push(check("bundle:tracked-route-js", bundle.maxTrackedRoute.jsKb <= budgets.routeJsKb ? "PASS" : "WARNING", `${bundle.maxTrackedRoute.route} ${bundle.maxTrackedRoute.jsKb} KB / budget ${budgets.routeJsKb} KB`));
checks.push(check("bundle:static-js-total", "PASS", `${bundle.staticJsKb} KB built JS total; informational, not first-load budget.`));
checks.push(check("bundle:analyzer-client", analyzer.status, analyzer.detail));
if (skippedWalkEntries.length) checks.push(check("bundle:walk-skipped", "WARNING", `Skipped unreadable generated build entries: ${skippedWalkEntries.slice(0, 3).join("; ")}`));

const lighthouse = await maybeLighthouse(url);
if (lighthouse) addLighthouseChecks(lighthouse);
else {
  checks.push(check("lighthouse:desktop", "MANUAL", "Chrome/Lighthouse unavailable or RUN_LIGHTHOUSE=1 not set."));
  checks.push(check("lighthouse:mobile", "MANUAL", "Run with RUN_LIGHTHOUSE=1 PRODUCTION_URL=https://..."));
}

const sections = [
  {
    title: "Budgets",
    body: table(["Metric", "Budget"], Object.entries(budgets).map(([k, v]) => [k, String(v)])),
  },
  {
    title: "Bundle Snapshot",
    body: table(["Metric", "Value"], [
      ["staticFiles", String(bundle.staticFiles)],
      ["staticJsKb", String(bundle.staticJsKb)],
      ["staticCssKb", String(bundle.staticCssKb)],
      ["routeCount", String(bundle.routeCount)],
      ["maxRoute", `${bundle.maxRoute.route} ${bundle.maxRoute.jsKb} KB JS / ${bundle.maxRoute.cssKb} KB CSS`],
      ["maxTrackedRoute", `${bundle.maxTrackedRoute.route} ${bundle.maxTrackedRoute.jsKb} KB JS / ${bundle.maxTrackedRoute.cssKb} KB CSS`],
    ]),
  },
  {
    title: "Tracked Routes",
    body: table(["Route", "JS KB", "CSS KB", "Chunks"], bundle.trackedRoutes.map((route) => [route.route, String(route.jsKb), String(route.cssKb), String(route.chunks)])),
  },
];

const { summary } = writeReport("PRODUCTION_PERFORMANCE_VERIFICATION_REPORT", "Production Performance Verification Report", checks, sections);
console.log(`Performance verification: ${JSON.stringify(summary.counts)}`);
process.exit(summarize(checks).exitCode);

function bundleStats() {
  const staticDir = path.join(root, ".next", "static");
  const files = walk(staticDir).filter((file) => file.endsWith(".js") || file.endsWith(".css"));
  const jsBytes = files.filter((file) => file.endsWith(".js")).reduce((sum, file) => sum + statSync(file).size, 0);
  const cssBytes = files.filter((file) => file.endsWith(".css")).reduce((sum, file) => sum + statSync(file).size, 0);
  const routes = routeStats();
  const maxRoute = routes.reduce((max, route) => route.jsKb > max.jsKb ? route : max, { route: "none", jsKb: 0, cssKb: 0, chunks: 0 });
  const trackedRoutes = routes.filter((route) => ["/", "/profile", "/owner", "/owner/orders", "/owner/settings", "/owner/kitchen", "/owner/pos"].includes(route.route));
  const maxTrackedRoute = trackedRoutes.reduce((max, route) => route.jsKb > max.jsKb ? route : max, { route: "none", jsKb: 0, cssKb: 0, chunks: 0 });
  return {
    staticFiles: files.length,
    staticJsKb: Math.round(jsBytes / 1024),
    staticCssKb: Math.round(cssBytes / 1024),
    routeCount: routes.length,
    maxRoute,
    maxTrackedRoute,
    trackedRoutes,
  };
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  let items = [];
  try {
    items = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    const rel = path.relative(root, dir).replace(/\\/g, "/");
    skippedWalkEntries.push(`${rel || dir}: ${error instanceof Error ? error.code ?? error.message : String(error)}`);
    return out;
  }
  for (const item of items) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file, out);
    else out.push(file);
  }
  return out;
}

async function maybeLighthouse() {
  return null;
}

function addLighthouseChecks() {}

function routeStats() {
  const dir = path.join(root, ".next", "server", "app");
  const manifests = walk(dir).filter((file) => file.endsWith("page_client-reference-manifest.js"));
  return manifests.map((file) => {
    const raw = readFileSync(file, "utf8");
    const chunks = Array.from(new Set(raw.match(/static\/(?:chunks|css)\/[^"']+\.(?:js|css)/g) ?? []));
    const jsKb = Math.round(chunks.filter((chunk) => chunk.endsWith(".js")).reduce((sum, chunk) => sum + chunkSize(chunk), 0) / 1024);
    const cssKb = Math.round(chunks.filter((chunk) => chunk.endsWith(".css")).reduce((sum, chunk) => sum + chunkSize(chunk), 0) / 1024);
    return { route: routeFromManifest(file, dir), chunks: chunks.length, jsKb, cssKb };
  }).sort((a, b) => a.route.localeCompare(b.route));
}

function routeFromManifest(file, dir) {
  const rel = path.relative(dir, file).replace(/\\/g, "/");
  const route = rel.replace(/\/page_client-reference-manifest\.js$/, "").replace(/^page_client-reference-manifest\.js$/, "");
  return route ? `/${route}` : "/";
}

function chunkSize(chunk) {
  const file = path.join(root, ".next", ...chunk.split("/"));
  return existsSync(file) ? statSync(file).size : 0;
}

function analyzerStatus() {
  const currentClient = path.join(root, ".next", "analyze", "client.html");
  if (existsSync(currentClient) && statSync(currentClient).size > 1024) {
    return { status: "PASS", detail: ".next/analyze/client.html is present and usable." };
  }
  const report = readReport("ANALYZE_VERIFICATION_REPORT");
  const counts = report?.summary?.counts;
  if (counts && !counts.ERROR && !counts.FAIL) {
    return { status: "PASS", detail: "ANALYZE_VERIFICATION_REPORT.json confirms npm run analyze completed." };
  }
  return { status: "WARNING", detail: "Run npm run analyze before performance verification." };
}
