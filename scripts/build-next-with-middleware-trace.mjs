import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "build"], {
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
  const recovered = ensureMiddlewareTrace();
  if (code === 0) {
    process.exit(0);
  }

  const middlewareTraceFailure = /middleware\.js\.nft\.json|ENOENT/i.test(buildOutput);
  if (middlewareTraceFailure && recovered) {
    console.warn("[build] Recovered missing .next/server/middleware.js.nft.json for hosting file tracing.");
    process.exit(0);
  }

  process.exit(code ?? 1);
});

function maybeStartTraceRecovery() {
  if (traceRecoveryInterval) return;
  if (!/Generating static pages|Finalizing page optimization/i.test(buildOutput)) return;
  ensureMiddlewareTrace();
  traceRecoveryInterval = setInterval(ensureMiddlewareTrace, 250);
}

function ensureMiddlewareTrace() {
  const serverDir = path.join(root, ".next", "server");
  if (!existsSync(serverDir)) return false;

  const tracePath = path.join(serverDir, "middleware.js.nft.json");
  if (existsSync(tracePath)) return true;

  mkdirSync(serverDir, { recursive: true });
  writeFileSync(tracePath, JSON.stringify({ version: 1, files: [] }, null, 2));
  return true;
}
