import { existsSync, readFileSync } from "node:fs";
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
