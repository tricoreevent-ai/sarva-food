import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const targets = ["src/app/api", "src/repositories", "src/lib/server", "src/hooks", "src/components/flows", "public/sw.js"];
const out = join(root, "docs/validation/repository-hardening-audit.md");
mkdirSync(join(root, "docs/validation"), { recursive: true });
const files = targets.flatMap((target) => walk(join(root, target)))
  .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file))
  .filter((file) => !file.endsWith("src\\lib\\server\\production-logger.ts"));

const checks = [
  { id: "runtime-console", pattern: /\bconsole\.(log|warn|error|info)\b/g, note: "Runtime console call; prefer productionLogger or operational logging." },
  { id: "raw-error-message", pattern: /\berror\.message\b|\bmessage:\s*error\b/g, note: "Raw error-message access; ensure returned/logged text is sanitized." },
  { id: "debt-marker", pattern: /\b(TODO|FIXME|HACK|XXX|TEMP)\b/gi, note: "Debt marker requiring release triage." },
  { id: "firestore-unbounded-get", pattern: /\.collection\([^)]+\)(?![\s\S]{0,160}\.limit\()\s*\.get\(/g, note: "Potential unbounded Firestore collection read." },
  { id: "listener-lifecycle", pattern: /\bonSnapshot\(|new EventSource\(|setInterval\(|addEventListener\(/g, note: "Realtime/listener site; verify cleanup and reconnect bounds." },
  { id: "api-error-envelope", pattern: /NextResponse\.json\(\s*\{\s*error:/g, note: "API error envelope; verify requestId/meta where customer-safe." },
];

const rows = checks.map((check) => {
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const count = [...text.matchAll(check.pattern)].length;
    if (count) hits.push({ file: rel(file), count });
  }
  return { ...check, hits };
});

const now = new Date().toISOString();
const body = [
  "# Repository Hardening Audit",
  "",
  `Generated: ${now}`,
  "",
  "| Check | Hits | Note |",
  "| --- | ---: | --- |",
  ...rows.map((row) => `| ${row.id} | ${row.hits.reduce((sum, hit) => sum + hit.count, 0)} | ${row.note} |`),
  "",
  "## Top Findings",
  "",
  ...rows.flatMap((row) => [
    `### ${row.id}`,
    "",
    ...(row.hits.length ? row.hits.slice(0, 30).map((hit) => `- \`${hit.file}\` (${hit.count})`) : ["- None"]),
    ...(row.hits.length > 30 ? [`- ${row.hits.length - 30} more files omitted.`] : []),
    "",
  ]),
  "## Release Interpretation",
  "",
  "- This audit is static and repository-side only.",
  "- A hit is not automatically a bug; it marks code that needs safe logging, cleanup, bounded query, or listener review.",
  "- Provider, Hostinger, Firebase Console, authenticated browser, physical printer, and real-device checks remain manual.",
  "",
].join("\n");

writeFileSync(out, body);
console.log(`Repository hardening audit written to ${rel(out)}`);

function walk(path) {
  const stats = statSync(path);
  if (stats.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === ".next") return [];
    return walk(join(path, entry.name));
  });
}

function rel(path) {
  return relative(root, path).replace(/\\/g, "/");
}
