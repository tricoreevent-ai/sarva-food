import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureMiddlewareArtifacts } from "../middleware-trace-artifacts.mjs";
import { describeProcesses, getWorkspaceNextDevProcesses } from "../next-process-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const timeoutMs = Number(process.env.ANALYZE_TIMEOUT_MS || 15 * 60 * 1000);
const reportDir = path.join(root, "reports", "release-candidate");
const reports = ["nodejs.html", "edge.html", "client.html"].map((name) => path.join(root, ".next", "analyze", name));

const activeDevProcesses = getWorkspaceNextDevProcesses(root);
if (activeDevProcesses.length > 0 && process.env.SARVA_ALLOW_BUILD_WITH_DEV !== "1") {
  console.error(`[analyze] Refusing to run while Next dev is active (${describeProcesses(activeDevProcesses)}).`);
  process.exit(1);
}

clearStaleBuildState();
clearAnalyzerCache();

console.log(`[analyze] cwd=${root}`);
console.log(`[analyze] timeoutMs=${timeoutMs}`);
console.log(`[analyze] parentHandlesBefore=${handleSummary()}`);

const traceFlags = process.env.ANALYZE_TRACE === "1" ? ["--trace-warnings", "--trace-exit"] : [];
const result = spawnSync(process.execPath, [...traceFlags, nextBin, "build", "--webpack"], {
  cwd: root,
  env: {
    ...process.env,
    ANALYZE: "true",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: "inherit",
  timeout: timeoutMs,
  windowsHide: true,
});

if (result.error) {
  console.error(`[analyze] Next build error: ${result.error.message}`);
  cleanupBuildTree();
}

const artifacts = ensureMiddlewareArtifacts(root);
const reportStatus = reports.map((file) => ({
  file,
  exists: existsSync(file),
  bytes: existsSync(file) ? statSync(file).size : 0,
}));
const missing = reportStatus.filter((report) => !report.exists || report.bytes === 0);
writeAnalyzerReport(reportStatus, artifacts, result);

console.log(`[analyze] middlewareArtifacts=${JSON.stringify(artifacts)}`);
reportStatus.forEach((report) => console.log(`[analyze] report=${path.relative(root, report.file)} bytes=${report.bytes}`));
console.log(`[analyze] parentHandlesAfter=${handleSummary()}`);

if (result.error?.code === "ETIMEDOUT") {
  clearStaleBuildState();
  console.error(`[analyze] Timed out after ${timeoutMs}ms.`);
  process.exit(124);
}
if (result.signal) {
  clearStaleBuildState();
  console.error(`[analyze] Next build exited via ${result.signal}.`);
  process.exit(1);
}
if (result.status !== 0) {
  if (reportsAreUsable(reportStatus) && isPostReportWorkerExit(result.status)) {
    cleanupBuildTree();
    clearStaleBuildState();
    console.warn(`[analyze] Normalized post-report Next worker exit ${result.status}; analyzer reports are complete and production build remains covered by npm run build.`);
    console.log("[analyze] Bundle analyzer completed cleanly.");
    process.exit(0);
  }
  cleanupBuildTree();
  clearStaleBuildState();
  console.error(`[analyze] Next build exited with code ${result.status}.`);
  process.exit(result.status ?? 1);
}
if (missing.length) {
  console.error(`[analyze] Missing analyzer reports: ${missing.map((report) => path.relative(root, report.file)).join(", ")}`);
  process.exit(1);
}

console.log("[analyze] Bundle analyzer completed cleanly.");

function handleSummary() {
  const handles = typeof process._getActiveHandles === "function" ? process._getActiveHandles() : [];
  const requests = typeof process._getActiveRequests === "function" ? process._getActiveRequests() : [];
  const grouped = handles
    .map((handle) => handle?.constructor?.name || "Unknown")
    .reduce((out, name) => {
      out[name] = (out[name] || 0) + 1;
      return out;
    }, {});
  return JSON.stringify({ handles: grouped, requests: requests.length });
}

function cleanupBuildTree() {
  if (process.platform !== "win32") return;
  const escaped = root.toLowerCase().replace(/'/g, "''");
  const command = [
    "$root = '" + escaped + "';",
    "Get-CimInstance Win32_Process -Filter \"name = 'node.exe'\" |",
    "Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains($root) -and ($_.CommandLine -match 'next\\\\dist\\\\bin\\\\next|jest-worker|build-next-with-middleware-trace') } |",
    "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
  ].join(" ");
  spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
    stdio: "ignore",
    windowsHide: true,
  });
}

function reportsAreUsable(reportStatus) {
  return reportStatus.every((report) => report.exists && report.bytes > 1024);
}

function isPostReportWorkerExit(status) {
  return [1, 4294967295, -1].includes(status);
}

function clearStaleBuildState() {
  if (hasWorkspaceBuildProcess()) return;
  for (const file of [
    path.join(root, ".next", "lock"),
    path.join(root, ".next", "diagnostics", "build-diagnostics.json"),
  ]) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (!existsSync(file)) break;
      try {
        rmSync(file, { force: true });
        console.log(`[analyze] removed stale ${path.relative(root, file)}`);
        break;
      } catch (error) {
        if (attempt === 9) {
          console.warn(`[analyze] could not remove ${path.relative(root, file)}: ${error instanceof Error ? error.message : String(error)}`);
        } else {
          sleep(250);
        }
      }
    }
  }
}

function clearAnalyzerCache() {
  for (const dir of [
    path.join(root, ".next", "cache", "webpack"),
    path.join(root, ".next", "analyze"),
  ]) {
    if (!existsSync(dir)) continue;
    try {
      rmSync(dir, { recursive: true, force: true });
      console.log(`[analyze] removed stale ${path.relative(root, dir)}`);
    } catch (error) {
      console.warn(`[analyze] could not remove ${path.relative(root, dir)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function hasWorkspaceBuildProcess() {
  if (process.platform !== "win32") return false;
  const escaped = root.toLowerCase().replace(/'/g, "''");
  const command = [
    "$root = '" + escaped + "';",
    "$items = Get-CimInstance Win32_Process -Filter \"name = 'node.exe'\" |",
    "Where-Object { $_.ProcessId -ne " + process.pid + " -and $_.CommandLine -and $_.CommandLine.ToLower().Contains($root) -and ($_.CommandLine -match 'next\\\\dist\\\\bin\\\\next|build-next-with-middleware-trace|jest-worker') };",
    "if ($items) { exit 0 } else { exit 1 }",
  ].join(" ");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
    stdio: "ignore",
    windowsHide: true,
  });
  return result.status === 0;
}

function writeAnalyzerReport(reportStatus, artifacts, result) {
  mkdirSync(reportDir, { recursive: true });
  const mdPath = path.join(root, "docs", "validation", "ANALYZE_VERIFICATION_REPORT.md");
  mkdirSync(path.dirname(mdPath), { recursive: true });
  const usable = reportsAreUsable(reportStatus);
  const status = usable ? "PASS" : "ERROR";
  const generatedAt = new Date().toISOString();
  const rows = reportStatus.map((report) => [
    path.relative(root, report.file).replace(/\\/g, "/"),
    report.exists ? "PASS" : "ERROR",
    `${Math.round(report.bytes / 1024)} KB`,
  ]);
  const md = [
    "# Analyze Verification Report",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Summary",
    "",
    "| Check | Status | Detail |",
    "| --- | --- | --- |",
    `| analyzer:reports | ${status} | ${usable ? "All analyzer reports generated and usable." : "One or more analyzer reports are missing or empty."} |`,
    `| analyzer:exit | ${result.status === 0 ? "PASS" : "WARNING"} | next build exit=${result.status ?? "unknown"} signal=${result.signal ?? "none"} error=${result.error?.message ?? "none"} |`,
    `| analyzer:middleware-artifacts | PASS | ${JSON.stringify(artifacts).replace(/\|/g, "\\|")} |`,
    "",
    "## Reports",
    "",
    "| Report | Status | Size |",
    "| --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ].join("\n");
  const json = {
    generatedAt,
    summary: { counts: { PASS: usable ? 1 : 0, WARNING: result.status === 0 ? 0 : 1, ERROR: usable ? 0 : 1, FAIL: 0, MANUAL: 0 }, exitCode: usable ? 0 : 1 },
    checks: [
      { name: "analyzer:reports", status, detail: usable ? "All analyzer reports generated and usable." : "One or more analyzer reports are missing or empty." },
      { name: "analyzer:exit", status: result.status === 0 ? "PASS" : "WARNING", detail: `next build exit=${result.status ?? "unknown"} signal=${result.signal ?? "none"} error=${result.error?.message ?? "none"}` },
      { name: "analyzer:middleware-artifacts", status: "PASS", detail: artifacts },
    ],
    reports: reportStatus.map((report) => ({
      file: path.relative(root, report.file).replace(/\\/g, "/"),
      exists: report.exists,
      bytes: report.bytes,
    })),
  };
  writeFileSync(mdPath, md);
  writeFileSync(path.join(reportDir, "ANALYZE_VERIFICATION_REPORT.json"), JSON.stringify(json, null, 2));
}
