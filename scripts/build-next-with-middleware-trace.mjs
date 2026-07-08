import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureMiddlewareArtifacts as ensureSharedMiddlewareArtifacts } from "./middleware-trace-artifacts.mjs";
import { describeProcesses, getWorkspaceNextDevProcesses } from "./next-process-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const activeDevProcesses = getWorkspaceNextDevProcesses(root);
if (activeDevProcesses.length > 0 && process.env.SARVA_ALLOW_BUILD_WITH_DEV !== "1") {
  console.error(`[build] Refusing to run production build while Next dev is active (${describeProcesses(activeDevProcesses)}).`);
  console.error("[build] Stop the dev server first, or set SARVA_ALLOW_BUILD_WITH_DEV=1 if you intentionally accept .next cache churn.");
  process.exit(1);
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "build", "--webpack"], {
  cwd: root,
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

let buildOutput = "";
let traceRecoveryInterval;

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  buildOutput += text;
  maybeStartTraceRecovery();
  safeWrite(process.stdout, text);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  buildOutput += text;
  maybeStartTraceRecovery();
  safeWrite(process.stderr, text);
});

child.on("close", (code) => {
  if (traceRecoveryInterval) clearInterval(traceRecoveryInterval);
  const recovered = ensureMiddlewareArtifacts();
  if (code === 0) {
    process.exit(0);
  }

  const middlewareTraceFailure = /middleware\.js\.nft\.json/i.test(buildOutput);
  if (middlewareTraceFailure && recovered.trace) {
    console.warn("[build] Recovered missing .next/server/middleware.js.nft.json for hosting file tracing.");
    process.exit(0);
  }

  const globalErrorTraceFailure = /_global-error[\\/]page\.js\.nft\.json/i.test(buildOutput);
  if (globalErrorTraceFailure && recovered.globalErrorTrace) {
    console.warn("[build] Recovered missing .next/server/app/_global-error/page.js.nft.json for hosting file tracing.");
    process.exit(0);
  }

  process.exit(code ?? 1);
});

function maybeStartTraceRecovery() {
  if (traceRecoveryInterval) return;
  if (!/Generating static pages|Finalizing page optimization/i.test(buildOutput)) return;
  ensureMiddlewareArtifacts();
  traceRecoveryInterval = setInterval(ensureMiddlewareArtifacts, 250);
}

function safeWrite(stream, text) {
  try {
    stream.write(text);
  } catch (error) {
    if (!(error instanceof Error) || error.code !== "EPIPE") throw error;
  }
}

function ensureMiddlewareArtifacts() {
  return ensureSharedMiddlewareArtifacts(root);
}
