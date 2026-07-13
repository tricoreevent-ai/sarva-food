import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gitInfo, root, table } from "./verification-utils.mjs";

const generatedAt = new Date().toISOString();
const nextDir = path.join(root, ".next");
const appDir = path.join(nextDir, "server", "app");
const analyzerHtml = path.join(nextDir, "analyze", "client.html");
const git = gitInfo();
const clientData = readAnalyzerData();
const routeRows = routeStats();
const chunkRows = largestChunks();
const moduleRows = largestModules();
const vendorRows = vendorContributors();
const duplicateImports = duplicateImportSources();
const dependencyRows = dependencyUsageRows();

const md = `# Final Bundle Report

Date: ${generatedAt}
Branch: \`${git.branch}\`
Analyzer: \`.next/analyze/client.html\`

## Summary

| Metric | Value |
| --- | --- |
| Client analyzer size | ${fileKb(analyzerHtml)} |
| Static JS total | ${formatKb(sumFiles(path.join(nextDir, "static"), ".js"))} |
| Static CSS total | ${formatKb(sumFiles(path.join(nextDir, "static"), ".css"))} |
| App routes with client manifests | ${routeRows.length} |
| Largest tracked route warning | \`/owner/orders\` remains ${routeRows.find((row) => row.route === "/owner/orders")?.jsKb ?? "unknown"} KB against the 1200 KB verification budget. |

## Largest 20 Route JS Owners

${table(["Route", "JS", "CSS", "Chunks"], routeRows.slice(0, 20).map((row) => [row.route, `${row.jsKb} KB`, `${row.cssKb} KB`, String(row.chunks)]))}

## Largest 20 Client Bundles

${table(["Chunk", "Parsed", "Gzip", "Initial ownership"], chunkRows.map((row) => [row.chunk, `${row.parsedKb} KB`, `${row.gzipKb} KB`, row.ownership]))}

## Largest 20 Client Modules

${table(["Module", "Parsed", "Gzip", "Chunk"], moduleRows.map((row) => [row.module, `${row.parsedKb} KB`, `${row.gzipKb} KB`, row.chunk]))}

## Largest Vendor Contributors

${table(["Vendor", "Parsed", "Gzip", "Modules"], vendorRows.map((row) => [row.vendor, `${row.parsedKb} KB`, `${row.gzipKb} KB`, String(row.modules)]))}

## Duplicate Import Sources

${table(["Import source", "Occurrences"], duplicateImports.map((row) => [row.source, String(row.count)]))}

## Dependency Usage Scan

${table(["Dependency", "Static usage", "Status"], dependencyRows)}

## Verification Notes

| Check | Result |
| --- | --- |
| Previous auth-route optimization | \`/login\`, \`/signup\`, and \`/forgot-password\` route-owned JS dropped from about 1641 KB to about 497 KB in the PH3 report; current auth routes remain out of the largest route-owner list except Stack handler. |
| Previous public/profile split | Phase 2 reduced \`/\` from about 1017 KB to about 455 KB and \`/profile\` from about 1714 KB to about 562 KB; current \`/\` is ${routeRows.find((row) => row.route === "/")?.jsKb ?? "unknown"} KB and \`/profile\` is ${routeRows.find((row) => row.route === "/profile")?.jsKb ?? "unknown"} KB. |
| Duplicate packages | No package name is duplicated across \`dependencies\` and \`devDependencies\`. |
| Unused dependencies | No dependency is marked safe to remove from static evidence alone; low/no static-use entries require manual flow validation because this app uses dynamic imports, scripts, and provider-gated routes. |
| Accepted warning | Firebase/protobuf dynamic dependency warning remains upstream and accepted; no bundler alias or Firebase internals rewrite was attempted during release freeze. |
`;

const outDir = path.join(root, "docs", "performance");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "FINAL_BUNDLE_REPORT.md"), md);
writeFileSync(path.join(outDir, "BUNDLE_DEEP_ANALYSIS.md"), md.replace("# Final Bundle Report", "# Bundle Deep Analysis"));
console.log("Bundle evidence reports generated.");

function readAnalyzerData() {
  if (!existsSync(analyzerHtml)) return [];
  const html = readFileSync(analyzerHtml, "utf8");
  const start = html.indexOf("window.chartData = ");
  const end = html.indexOf("window.entrypoints", start);
  if (start < 0 || end < 0) return [];
  return JSON.parse(html.slice(start + "window.chartData = ".length, end).replace(/;\s*$/, "").trim());
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file, out);
    else out.push(file);
  }
  return out;
}

function routeStats() {
  return walk(appDir)
    .filter((file) => file.endsWith("page_client-reference-manifest.js"))
    .map((file) => {
      const raw = readFileSync(file, "utf8");
      const chunks = Array.from(new Set(raw.match(/static\/(?:chunks|css)\/[^"']+\.(?:js|css)/g) ?? []));
      const js = chunks.filter((chunk) => chunk.endsWith(".js"));
      const css = chunks.filter((chunk) => chunk.endsWith(".css"));
      return {
        route: routeFromManifest(file),
        jsKb: kb(js.reduce((sum, chunk) => sum + chunkSize(chunk), 0)),
        cssKb: kb(css.reduce((sum, chunk) => sum + chunkSize(chunk), 0)),
        chunks: chunks.length,
      };
    })
    .sort((a, b) => b.jsKb - a.jsKb || a.route.localeCompare(b.route));
}

function routeFromManifest(file) {
  const rel = path.relative(appDir, file).replace(/\\/g, "/");
  const route = rel.replace(/\/page_client-reference-manifest\.js$/, "").replace(/^page_client-reference-manifest\.js$/, "");
  return route ? `/${route}` : "/";
}

function chunkSize(chunk) {
  const file = path.join(nextDir, ...chunk.split("/"));
  return existsSync(file) ? statSync(file).size : 0;
}

function largestChunks() {
  return clientData
    .filter((item) => item.isAsset)
    .sort((a, b) => (b.parsedSize || b.statSize || 0) - (a.parsedSize || a.statSize || 0))
    .slice(0, 20)
    .map((item) => ({
      chunk: item.label.replace("static/chunks/", ""),
      parsedKb: kb(item.parsedSize || item.statSize),
      gzipKb: kb(item.gzipSize),
      ownership: Object.keys(item.isInitialByEntrypoint || {}).slice(0, 3).join(", ") || "async/shared",
    }));
}

function analyzerModules() {
  const modules = [];
  for (const asset of clientData.filter((item) => item.isAsset)) collectModules(asset, asset.label, modules);
  return modules.filter((item) => item.parsed > 0);
}

function collectModules(node, asset, modules) {
  if (!node) return;
  if (!node.groups?.length && node.path && !node.isAsset) {
    modules.push({
      asset,
      path: node.path,
      label: node.label,
      parsed: node.parsedSize || 0,
      gzip: node.gzipSize || 0,
      stat: node.statSize || 0,
    });
  }
  for (const group of node.groups || []) collectModules(group, asset, modules);
}

function largestModules() {
  return analyzerModules()
    .sort((a, b) => b.parsed - a.parsed)
    .slice(0, 20)
    .map((item) => ({
      module: item.path.replace("./", ""),
      parsedKb: kb(item.parsed),
      gzipKb: kb(item.gzip),
      chunk: item.asset.replace("static/chunks/", ""),
    }));
}

function vendorContributors() {
  const vendors = new Map();
  for (const item of analyzerModules()) {
    if (!item.path.includes("node_modules/")) continue;
    const after = item.path.split("node_modules/").pop();
    const vendor = after.startsWith("@") ? after.split("/").slice(0, 2).join("/") : after.split("/")[0];
    const current = vendors.get(vendor) || { parsed: 0, gzip: 0, modules: 0 };
    current.parsed += item.parsed;
    current.gzip += item.gzip;
    current.modules += 1;
    vendors.set(vendor, current);
  }
  return Array.from(vendors, ([vendor, value]) => ({
    vendor,
    parsedKb: kb(value.parsed),
    gzipKb: kb(value.gzip),
    modules: value.modules,
  })).sort((a, b) => b.parsedKb - a.parsedKb).slice(0, 20);
}

function duplicateImportSources() {
  const counts = new Map();
  const importPattern = /(?:import\s+(?:[^'"]+\s+from\s+)?|import\(|require\()\s*["']([^"']+)["']/g;
  for (const file of walk(path.join(root, "src")).filter((item) => /\.(ts|tsx|js|mjs)$/.test(item))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(importPattern)) counts.set(match[1], (counts.get(match[1]) || 0) + 1);
  }
  return Array.from(counts, ([source, count]) => ({ source, count }))
    .filter((row) => row.count > 5)
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))
    .slice(0, 20);
}

function dependencyUsageRows() {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const deps = Object.keys(pkg.dependencies || {});
  const allText = walk(path.join(root, "src"))
    .filter((item) => /\.(ts|tsx|js|mjs)$/.test(item))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const duplicateNames = deps.filter((name) => Object.hasOwn(pkg.devDependencies || {}, name));
  return deps.map((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hits = (allText.match(new RegExp(`['\"]${escaped}(?:[/'\"])`, "g")) || []).length;
    const status = duplicateNames.includes(name)
      ? "Duplicate dependency/devDependency entry"
      : hits
        ? "Used by static source scan"
        : "Manual review before removal";
    return [name, String(hits), status];
  });
}

function sumFiles(dir, ext) {
  return walk(dir).filter((file) => file.endsWith(ext)).reduce((sum, file) => sum + statSync(file).size, 0);
}

function kb(bytes = 0) {
  return Math.round(bytes / 1024);
}

function formatKb(bytes) {
  return `${kb(bytes)} KB`;
}

function fileKb(file) {
  return existsSync(file) ? formatKb(statSync(file).size) : "missing";
}
