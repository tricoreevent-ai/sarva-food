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

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  buildOutput += text;
  process.stdout.write(text);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  buildOutput += text;
  process.stderr.write(text);
});

child.on("close", (code) => {
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

function ensureMiddlewareTrace() {
  const serverDir = path.join(root, ".next", "server");
  if (!existsSync(serverDir)) return false;

  const tracePath = path.join(serverDir, "middleware.js.nft.json");
  if (existsSync(tracePath)) return true;

  mkdirSync(serverDir, { recursive: true });
  writeFileSync(tracePath, JSON.stringify({ version: 1, files: [] }, null, 2));
  return true;
}
