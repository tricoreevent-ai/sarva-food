import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function readGitHead() {
  try {
    const gitDir = join(process.cwd(), ".git");
    const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
    if (!head.startsWith("ref:")) return head;
    const ref = head.slice(5).trim();
    const refPath = join(gitDir, ref);
    if (existsSync(refPath)) return readFileSync(refPath, "utf8").trim();
    const packed = readFileSync(join(gitDir, "packed-refs"), "utf8");
    return packed.split(/\r?\n/).find((line) => line.endsWith(` ${ref}`))?.split(" ")[0] ?? null;
  } catch {
    return null;
  }
}

export function getBuildCommit() {
  return (
    process.env.HOSTINGER_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_COMMIT ||
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_COMMIT_SHA ||
    readGitHead() ||
    "unknown"
  );
}

export function getBuildTimestamp() {
  const configured =
    process.env.NEXT_PUBLIC_BUILD_DATE ||
    process.env.NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP ||
    process.env.BUILD_DATE;
  if (configured) return configured;
  try {
    return statSync(join(process.cwd(), ".next", "BUILD_ID")).mtime.toISOString();
  } catch {
    return new Date(Date.now() - process.uptime() * 1000).toISOString();
  }
}
