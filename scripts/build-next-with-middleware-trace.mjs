import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  process.stdout.write(text);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  buildOutput += text;
  maybeStartTraceRecovery();
  process.stderr.write(text);
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

  process.exit(code ?? 1);
});

function maybeStartTraceRecovery() {
  if (traceRecoveryInterval) return;
  if (!/Generating static pages|Finalizing page optimization/i.test(buildOutput)) return;
  ensureMiddlewareArtifacts();
  traceRecoveryInterval = setInterval(ensureMiddlewareArtifacts, 250);
}

function ensureMiddlewareArtifacts() {
  return {
    runtime: ensureMiddlewareRuntime(),
    trace: ensureMiddlewareTrace(),
  };
}

function ensureMiddlewareRuntime() {
  const serverDir = path.join(root, ".next", "server");
  if (!existsSync(serverDir)) return false;

  const middlewarePath = path.join(serverDir, "middleware.js");
  if (existsSync(middlewarePath)) return true;

  const proxyPath = path.join(serverDir, "proxy.js");
  if (!existsSync(proxyPath)) return false;

  copyFileSync(proxyPath, middlewarePath);
  const proxyMapPath = `${proxyPath}.map`;
  if (existsSync(proxyMapPath)) {
    copyFileSync(proxyMapPath, `${middlewarePath}.map`);
  }
  return true;
}

function ensureMiddlewareTrace() {
  const serverDir = path.join(root, ".next", "server");
  if (!existsSync(serverDir)) return false;

  const tracePath = path.join(serverDir, "middleware.js.nft.json");
  if (existsSync(tracePath)) return true;

  const proxyTracePath = path.join(serverDir, "proxy.js.nft.json");
  if (existsSync(proxyTracePath)) {
    const proxyTrace = JSON.parse(readFileSync(proxyTracePath, "utf8"));
    proxyTrace.files = Array.isArray(proxyTrace.files)
      ? proxyTrace.files.map((file) => (file === "proxy.js" ? "middleware.js" : file))
      : [];
    writeFileSync(tracePath, JSON.stringify(proxyTrace, null, 2));
    return true;
  }

  mkdirSync(serverDir, { recursive: true });
  writeFileSync(tracePath, JSON.stringify({ version: 1, files: [] }, null, 2));
  return true;
}
