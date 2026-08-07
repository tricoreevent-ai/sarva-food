import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { envValue, readReport, releaseVersion, root } from "./verification-utils.mjs";

const git = (...args) => {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return "unknown"; }
};
const stateFile = path.join(root, "reports", "release-candidate", "PREDEPLOY_REPORT.json");
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : { checks: [] };
const envReport = readReport("PRODUCTION_ENV_VALIDATION_REPORT");
const required = (envReport?.checks ?? []).filter(({ name }) => name.startsWith("required:"));
const envChecks = envReport?.checks ?? [];
const blockers = envChecks.filter(({ status }) => status === "ERROR" || status === "FAIL");
const result = (id) => state.checks.find((item) => item.id === id)?.status ?? "NOT RUN";
const manual = [
  "Set and verify Hostinger production environment variables.",
  "Verify Firebase Console services, rules, indexes, authorized domains, and service account.",
  "Verify owner-scoped payment provider credentials and webhooks.",
  "Verify WhatsApp Cloud credentials if automated outbound messaging is enabled.",
  "Verify DNS/TLS and Sentry dashboards if configured.",
  "Complete production browser, device, accessibility, provider, and hardware smoke tests.",
];
const rows = required.map((item) => {
  const key = item.name.slice(9);
  const status = envChecks.some((check) => check.status === "ERROR" && check.name.includes(key)) ? "ERROR" : item.status;
  return `| \`${key}\` | ${status} | ${item.category ?? "General"} |`;
}).join("\n");
const gateRows = [
  ["Environment", "validate:prod-env"], ["Typecheck", "typecheck"], ["Lint", "lint"], ["Build", "build"],
  ["Release audit", "audit:release"], ["Operational smoke", "smoke:operational"], ["Theme", "theme:contrast"],
  ["Brand", "brand:visual"], ["Diff check", "diff:check"],
].map(([label, id]) => `| ${label} | ${result(id)} |`).join("\n");
const md = `# Automated Deployment Checklist

Generated: ${new Date().toISOString()}

| Field | Value |
| --- | --- |
| Repository SHA | \`${git("rev-parse", "HEAD")}\` |
| Branch | \`${git("rev-parse", "--abbrev-ref", "HEAD")}\` |
| Release version | \`${releaseVersion()}\` |
| Node version | \`${process.version}\` |
| Environment | \`${envValue("NEXT_PUBLIC_APP_ENV") || process.env.NODE_ENV || "not configured"}\` |
| Build status | ${result("build")} |
| Smoke status | ${result("smoke:operational")} |

## Automated Gates

| Gate | Status |
| --- | --- |
${gateRows}

## Required Environment Variables

| Variable | Status | Category |
| --- | --- | --- |
${rows || "| Not evaluated | NOT RUN | General |"}

## Configuration Blockers

${blockers.length ? blockers.map((item) => `- **${item.category ?? "General"}:** ${item.detail}`).join("\n") : "- None."}

## Health Endpoint Verification

- [ ] \`/health/live\` returns HTTP 200 with the expected SHA and version.
- [ ] \`/health/ready\` returns PASS with no blocking configuration or database failures.
- [ ] \`/health/startup\` returns PASS after a clean production restart.

## Outstanding Manual Tasks

${manual.map((item) => `- [ ] ${item}`).join("\n")}
`;
const output = path.join(root, "docs", "release", "AUTOMATED_DEPLOYMENT_CHECKLIST.md");
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, md);
console.log(`Deployment checklist written to ${path.relative(root, output)}`);
