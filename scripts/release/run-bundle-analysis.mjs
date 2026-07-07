import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "cmd" : "npm";
const args = process.platform === "win32" ? ["/c", "npm", "run", "build"] : ["run", "build"];
const result = spawnSync(command, args, {
  env: { ...process.env, ANALYZE: "true" },
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
