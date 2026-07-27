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
  { old: legacy.name.toLowerCase(), replacement: "Food Gedi public brand or documented compatibility namespace" },
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
    const normalizedFile = file.replace(/\\/g, "/");
    if (normalizedFile === "scripts/brand-audit.mjs" || normalizedFile.endsWith("docs/validation/BRAND_AUDIT_REPORT.md")) continue;
    const text = rest.join(":").trim();
    const status = classifyLegacyHit(normalizedFile, text);
    if (status) rows.push({ old: pattern.old, file, lineNo, text, replacement: pattern.replacement, status });
  }
}

const assetChecks = [
  "src/config/branding.ts",
  "src/lib/brand-system.ts",
  "src/components/brand/brand-provider.tsx",
  "src/components/brand/brand-logo.tsx",
  "src/app/manifest.ts",
  "public/icons/food-gedi-icon.svg",
  "public/icons/food-gedi-icon-white.svg",
  "public/icons/food-gedi-icon-black.svg",
  "public/icons/food-gedi-icon-small.svg",
  "public/icons/food-gedi-loading-icon.svg",
  "public/brand/food-gedi-logo.svg",
  "public/brand/food-gedi-logo-white.svg",
  "public/brand/food-gedi-logo-black.svg",
  "public/brand/food-gedi-logo-high-contrast.svg",
  "public/brand/food-gedi-logo-print.svg",
  "public/brand/food-gedi-logo-text.svg",
  "public/brand/food-gedi-logo-text-white.svg",
  "public/brand/food-gedi-logo-small.svg",
  "public/brand/food-gedi-logo-animated.svg",
  "public/favicon.ico",
  "public/apple-touch-icon.png",
  "public/android-chrome-192x192.png",
  "public/android-chrome-512x512.png",
  "public/android-chrome-maskable-512.png",
];

const surfaceChecks = [
  ["Header / Navbar", "BrandLogo + compact header mark", "light", "surface-aware component"],
  ["Sidebar", "BrandLogo sidebar/compact", "light", "shared component"],
  ["Login / Auth", "BrandLogo", "light panel", "shared component"],
  ["Customer website", "BrandLogo / BrandIcon", "light", "shared component"],
  ["Owner / Admin shell", "BrandLogo", "light", "owner design system"],
  ["Kitchen / POS", "BrandLogo / BrandIcon", "light and utility states", "shared component"],
  ["Splash / Loading", "LoadingLogo", "auto", "dedicated loading icon"],
  ["Empty states", "BrandIllustration", "light", "configured illustration"],
  ["Browser tab", "getFavicon", "n/a", "manifest/layout metadata"],
  ["PWA icons", "BrandAssets.pwa", "maskable/any", "manifest"],
  ["Notifications", "getNotificationIcon", "n/a", "browser + FCM webpush"],
  ["Receipts / invoices / print", "getLogoForBackground('print')", "print", "black/print-safe assets"],
  ["OpenGraph / Twitter", "BrandAssets.social", "n/a", "metadata"],
  ["High contrast", "getLogoForBackground('high-contrast')", "high contrast", "explicit asset"],
];

const directAssetResult = spawnSync("rg", ["--line-number", "--fixed-strings", "BRAND_CONFIG.assets", "src", "public", "scripts"], { cwd: root, encoding: "utf8" });
const directAssetRows = (directAssetResult.stdout.trim() ? directAssetResult.stdout.trim().split(/\r?\n/) : [])
  .map((line) => {
    const [file, lineNo, ...rest] = line.split(":");
    const normalizedFile = file.replace(/\\/g, "/");
    const text = rest.join(":").trim();
    const allowed = normalizedFile === "src/lib/brand-system.ts" || normalizedFile === "src/components/brand/brand-logo.tsx" || normalizedFile === "scripts/brand-audit.mjs";
    return { file, lineNo, text, status: allowed ? "contained" : "review" };
  });

const md = [
  "# Food Gedi Branding Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `- Brand config: ${existsSync(path.join(root, "src/config/branding.ts")) ? "completed" : "pending"}`,
  `- Brand resolver/provider: ${existsSync(path.join(root, "src/lib/brand-system.ts")) && existsSync(path.join(root, "src/components/brand/brand-provider.tsx")) ? "completed" : "pending"}`,
  `- Brand components: ${existsSync(path.join(root, "src/components/brand/brand-logo.tsx")) ? "completed" : "pending"}`,
  `- Actionable old-brand public hits: ${rows.filter((row) => row.status === "pending").length}`,
  `- Documented compatibility old-brand hits: ${rows.filter((row) => row.status !== "pending").length}`,
  `- Direct asset references outside brand layer: ${directAssetRows.filter((row) => row.status === "review").length}`,
  "",
  "## Root Cause Closed",
  "",
  "The prior logo visibility defects came from fixed asset selection at call sites. RC6 contains that decision in `src/lib/brand-system.ts` and `src/components/brand/brand-logo.tsx`, then resolves logos by surface instead of relying on CSS filters or each screen choosing a file manually.",
  "",
  "## Surface Inventory",
  "",
  "| Surface | API | Background | Status |",
  "| --- | --- | --- | --- |",
  ...surfaceChecks.map(([surface, api, bg, status]) => `| ${surface} | ${api} | ${bg} | ${status} |`),
  "",
  "## Required asset checks",
  "",
  "| Asset | Status |",
  "| --- | --- |",
  ...assetChecks.map((asset) => `| ${asset} | ${existsSync(path.join(root, asset)) ? "completed" : "pending"} |`),
  "",
  "## Direct Asset Containment",
  "",
  "| File | Line | Status |",
  "| --- | ---: | --- |",
  ...(directAssetRows.length ? directAssetRows.map((row) => `| ${escapeMd(row.file)} | ${row.lineNo} | ${row.status} |`) : ["| None | - | completed |"]),
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

function classifyLegacyHit(file, text) {
  if (file.startsWith("docs/")) return null;
  if (text.includes("release/production-nammude")) return "release-branch";
  if (
    text.includes("nammude.checkout.preferences")
    || text.includes("nammude.scheduledOrder")
    || text.includes("nammude-qr-cart")
    || text.includes("nammude-qr-device-id")
    || text.includes("nammude-local-payment-settings")
  ) return "compatibility-namespace";
  return "pending";
}
