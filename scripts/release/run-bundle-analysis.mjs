import { spawnSync } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCmd, ["run", "build"], {
  env: { ...process.env, ANALYZE: "true" },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
