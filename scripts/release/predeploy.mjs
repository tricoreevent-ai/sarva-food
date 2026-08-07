import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { root } from "./verification-utils.mjs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const gates = [
  ["validate:prod-env", npm, ["run", "validate:prod-env"]],
  ["typecheck", npm, ["run", "typecheck"]],
  ["lint", npm, ["run", "lint"]],
  ["build", npm, ["run", "build"]],
  ["audit:release", npm, ["run", "audit:release"]],
  ["smoke:operational", npm, ["run", "smoke:operational"]],
  ["theme:contrast", npm, ["run", "theme:contrast"]],
  ["brand:visual", npm, ["run", "brand:visual"]],
  ["diff:check", "git", ["diff", "--check"]],
];
const checks = [];
for (const [id, command, args] of gates) {
  console.log(`\n[predeploy] ${id}`);
  const started = Date.now();
  const run = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  checks.push({ id, status: run.status === 0 ? "PASS" : "FAIL", exitCode: run.status ?? 1, durationMs: Date.now() - started, ...(run.error ? { error: run.error.message } : {}) });
}
const reportDir = path.join(root, "reports", "release-candidate");
mkdirSync(reportDir, { recursive: true });
writeFileSync(path.join(reportDir, "PREDEPLOY_REPORT.json"), JSON.stringify({ generatedAt: new Date().toISOString(), checks }, null, 2));
spawnSync(process.execPath, [path.join(root, "scripts", "release", "generate-deployment-checklist.mjs")], { cwd: root, stdio: "inherit" });
const failed = checks.filter(({ status }) => status === "FAIL");
console.log(`\n[predeploy] ${failed.length ? `BLOCKED: ${failed.map(({ id }) => id).join(", ")}` : "PASS"}`);
process.exitCode = failed.length ? 1 : 0;
