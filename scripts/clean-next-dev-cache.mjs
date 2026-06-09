import { rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describeProcesses, getWorkspaceNextDevProcesses } from "./next-process-guard.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const nextDir = path.resolve(rootDir, ".next");
const devCacheDir = path.resolve(nextDir, "dev");

if (!devCacheDir.startsWith(`${nextDir}${path.sep}`)) {
  throw new Error(`Refusing to clean unexpected path: ${devCacheDir}`);
}

const activeDevProcesses = getWorkspaceNextDevProcesses(rootDir);
if (activeDevProcesses.length > 0) {
  console.warn(`Skipped .next/dev cleanup because Next dev is already running (${describeProcesses(activeDevProcesses)}).`);
  console.warn("Stop the running dev server before clearing the dev cache.");
  process.exit(0);
}

try {
  await stat(devCacheDir);
  await rm(devCacheDir, { recursive: true, force: true });
  console.log("Removed stale Next dev cache: .next/dev");
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}
