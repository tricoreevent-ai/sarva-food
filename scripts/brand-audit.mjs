import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "docs", "validation", "BRAND_AUDIT_REPORT.md");
const legacy = {
  name: ["Nam", "mude"].join(""),
  formerName: ["Sar", "va Food"].join(""),
  handle: ["@sar", "va.food"].join(""),
  logo: ["nam", "mude-logo"].join(""),
  icon: ["nam", "mude-icon"].join(""),
  appIcon: ["nam", "mude-app-icon"].join(""),
};
const patterns = [
  { old: legacy.name, replacement: "BRAND_CONFIG.name / APP_NAME" },
  { old: legacy.formerName, replacement: "BRAND_CONFIG.name / APP_NAME" },
  { old: legacy.handle, replacement: "BRAND_CONFIG social handle" },
  { old: legacy.logo, replacement: "BRAND_CONFIG.assets.logo*" },
  { old: legacy.icon, replacement: "BRAND_CONFIG.assets.icon*" },
  { old: legacy.appIcon, replacement: "BRAND_CONFIG.assets.icon*" },
];
const scopes = ["src", "public", "scripts", "docs"];
const rows = [];

for (const pattern of patterns) {
  const result = spawnSync("rg", ["--line-number", "--fixed-strings", pattern.old, ...scopes], { cwd: root, encoding: "utf8" });
  const lines = result.stdout.trim() ? result.stdout.trim().split(/\r?\n/) : [];
  for (const line of lines) {
    const [file, lineNo, ...rest] = line.split(":");
    const text = rest.join(":").trim();
    const status = file === "scripts/brand-audit.mjs" || file.endsWith("BRAND_AUDIT_REPORT.md")
      ? "documented"
      : "pending";
    rows.push({ old: pattern.old, file, lineNo, text, replacement: pattern.replacement, status });
  }
}

const assetChecks = [
  "src/config/branding.ts",
  "src/components/brand/brand-logo.tsx",
  "src/app/manifest.ts",
  "public/icons/food-gedi-icon.svg",
  "public/brand/food-gedi-logo.svg",
  "public/favicon.ico",
  "public/apple-touch-icon.png",
  "public/android-chrome-192x192.png",
  "public/android-chrome-512x512.png",
  "public/android-chrome-maskable-512.png",
];

const md = [
  "# Food Gedi Branding Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `- Brand config: ${existsSync(path.join(root, "src/config/branding.ts")) ? "completed" : "pending"}`,
  `- Brand components: ${existsSync(path.join(root, "src/components/brand/brand-logo.tsx")) ? "completed" : "pending"}`,
  `- Old-brand scan hits excluding this audit script: ${rows.filter((row) => row.status === "pending").length}`,
  "",
  "## Required asset checks",
  "",
  "| Asset | Status |",
  "| --- | --- |",
  ...assetChecks.map((asset) => `| ${asset} | ${existsSync(path.join(root, asset)) ? "completed" : "pending"} |`),
  "",
  "## Legacy reference scan",
  "",
  "| Old Brand | File | Line | Replacement | Status |",
  "| --- | --- | ---: | --- | --- |",
  ...(rows.length ? rows.map((row) => `| ${escapeMd(row.old)} | ${escapeMd(row.file)} | ${row.lineNo} | ${escapeMd(row.replacement)} | ${row.status} |`) : ["| None | - | - | - | completed |"]),
  "",
].join("\n");

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, md);
await readFile(out, "utf8").then((text) => process.stdout.write(text));

function escapeMd(value) {
  return String(value).replace(/\|/g, "\\|");
}
