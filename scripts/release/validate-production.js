void import("node:child_process").then(({ spawnSync }) => {
  const result = spawnSync(process.execPath, ["scripts/validate-production-env.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
});
