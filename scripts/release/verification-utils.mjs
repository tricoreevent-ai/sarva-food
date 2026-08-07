import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const root = process.cwd();
export const reportDir = path.join(root, "reports", "release-candidate");
export const docsDir = path.join(root, "docs");

const markdownReports = {
  ANALYZE_VERIFICATION_REPORT: ["validation", "ANALYZE_VERIFICATION_REPORT.md"],
  DEPLOYMENT_VERIFICATION_REPORT: ["validation", "DEPLOYMENT_VERIFICATION_REPORT.md"],
  MEMORY_STABILITY_REPORT: ["performance", "MEMORY_STABILITY_REPORT.md"],
  PRODUCTION_ENV_VALIDATION_REPORT: ["validation", "PRODUCTION_ENV_VALIDATION_REPORT.md"],
  PRODUCTION_PERFORMANCE_VERIFICATION_REPORT: ["performance", "PRODUCTION_PERFORMANCE_VERIFICATION_REPORT.md"],
  PRODUCTION_SMOKE_REPORT: ["validation", "PRODUCTION_SMOKE_REPORT.md"],
  PROVIDER_VERIFICATION_REPORT: ["validation", "PROVIDER_VERIFICATION_REPORT.md"],
};

export function ensureReportDir() {
  mkdirSync(reportDir, { recursive: true });
}

export function check(name, status, detail, meta = {}) {
  return { name, status, detail, ...meta };
}

export function summarize(checks) {
  const counts = { PASS: 0, WARNING: 0, ERROR: 0, FAIL: 0, MANUAL: 0 };
  for (const item of checks) counts[item.status] = (counts[item.status] || 0) + 1;
  const exitCode = counts.ERROR || counts.FAIL ? 1 : 0;
  return { counts, exitCode };
}

export function writeReport(baseName, title, checks, sections = []) {
  ensureReportDir();
  const summary = summarize(checks);
  const md = [
    `# ${title}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    table(["Status", "Count"], Object.entries(summary.counts).map(([k, v]) => [k, String(v)])),
    "",
    "## Checks",
    "",
    checks.some((item) => item.category)
      ? table(["Category", "Check", "Status", "Detail"], checks.map((item) => [item.category ?? "General", item.name, item.status, item.detail]))
      : table(["Check", "Status", "Detail"], checks.map((item) => [item.name, item.status, item.detail])),
    ...sections.flatMap((section) => ["", `## ${section.title}`, "", section.body]),
    "",
  ].join("\n");
  const json = { generatedAt: new Date().toISOString(), summary, checks, sections };
  const mdPath = reportMarkdownPath(baseName);
  mkdirSync(path.dirname(mdPath), { recursive: true });
  writeFileSync(mdPath, md);
  writeFileSync(path.join(reportDir, `${baseName}.json`), JSON.stringify(json, null, 2));
  return { summary, md, json };
}

export function reportMarkdownPath(baseName) {
  const mapped = markdownReports[baseName] ?? ["validation", `${baseName}.md`];
  return path.join(docsDir, ...mapped);
}

export function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

export function escapeCell(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

export function envValue(key) {
  return process.env[key]?.trim() ?? "";
}

export function isPlaceholder(value) {
  return !value || /^(replace|your_|example|placeholder|changeme|todo|xxx|\.\.\.)/i.test(value) || /REPLACE_WITH|example\.com|localhost/i.test(value);
}

export function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function gitInfo() {
  return {
    sha: runGit(["rev-parse", "HEAD"]) || "unknown",
    branch: runGit(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown",
    dirty: Boolean(runGit(["status", "--porcelain"])),
  };
}

export function releaseVersion() {
  const file = path.join(root, "src", "lib", "release.ts");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  return text.match(/RELEASE_VERSION\s*=\s*"([^"]+)"/)?.[1] ?? "unknown";
}

export function appUrl() {
  return (process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
}

export async function fetchJson(url, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    return { ok: response.ok, status: response.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

export function readReport(baseName) {
  const file = path.join(reportDir, `${baseName}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function runGit(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}
