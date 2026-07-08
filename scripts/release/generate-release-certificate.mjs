import nextEnv from "@next/env";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { appUrl, gitInfo, readReport, releaseVersion, root, table } from "./verification-utils.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });

const reports = [
  ["Bundle Analyzer", "ANALYZE_VERIFICATION_REPORT"],
  ["Production Validation", "PRODUCTION_ENV_VALIDATION_REPORT"],
  ["Deployment Verification", "DEPLOYMENT_VERIFICATION_REPORT"],
  ["Performance Verification", "PRODUCTION_PERFORMANCE_VERIFICATION_REPORT"],
  ["Smoke Results", "PRODUCTION_SMOKE_REPORT"],
  ["Memory Stability", "MEMORY_STABILITY_REPORT"],
  ["Provider Verification", "PROVIDER_VERIFICATION_REPORT"],
];
const git = gitInfo();
const rows = reports.map(([label, name]) => {
  const report = readReport(name);
  if (!report) return [label, "MISSING", "Run the matching verification script."];
  const counts = report.summary?.counts ?? {};
  const status = counts.ERROR || counts.FAIL ? "FAIL" : counts.MANUAL ? "MANUAL" : counts.WARNING ? "WARNING" : "PASS";
  return [label, status, JSON.stringify(counts)];
});
const go = rows.every(([, status]) => status === "PASS" || status === "WARNING");
const md = `# Final Release Certificate

Generated: ${new Date().toISOString()}

| Field | Value |
| --- | --- |
| Release Version | ${releaseVersion()} |
| Git SHA At Report Generation | ${git.sha}${git.dirty ? " (pre-final certification commit)" : ""} |
| Branch | ${git.branch} |
| Build Date | ${process.env.NEXT_PUBLIC_BUILD_DATE || process.env.BUILD_DATE || new Date().toISOString().slice(0, 10)} |
| Environment | ${process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "local-certification"} |
| Working Tree | ${git.dirty ? "Dirty before final certification commit" : "Clean"} |
| Production URL | ${appUrl() || "not configured"} |
| Plugin Foundation Status | Implemented, disabled by default |
| Enhancement Status | Phase 2A registry and Phase 2B runtime/SDK implemented locally; plugin runtime flags remain disabled by default |
| Release Decision | ${go ? "GO" : "NO GO"} |

## Verification

${table(["Area", "Status", "Detail"], rows)}

## Known Accepted Warnings

- Firebase/protobuf dynamic dependency warning from upstream Firebase server dependency code.
- Manual provider/hardware/browser gates remain NO GO until completed.

## Rollback Strategy

Redeploy the previous Hostinger commit, keep plugin flags disabled, and verify \`/api/release-info\` SHA/version after cache clear.

## Deployment Steps

1. Set production env vars.
2. Run \`npm run validate:prod-env\`.
3. Run \`npm run build\` and \`npm run analyze\`.
4. Deploy final commit to Hostinger.
5. Run deployment, provider, performance, memory, and smoke verification.

## Sign-off Checklist

${table(["Gate", "Status"], rows.map(([area, status]) => [area, status]))}
`;

writeFileSync(path.join(root, "FINAL_RELEASE_CERTIFICATE.md"), md);
console.log(`FINAL_RELEASE_CERTIFICATE.md generated: ${go ? "GO" : "NO GO"}`);
process.exit(go ? 0 : 1);
