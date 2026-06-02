import { rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const nextDir = path.resolve(rootDir, ".next");
const devCacheDir = path.resolve(nextDir, "dev");

if (!devCacheDir.startsWith(`${nextDir}${path.sep}`)) {
  throw new Error(`Refusing to clean unexpected path: ${devCacheDir}`);
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
