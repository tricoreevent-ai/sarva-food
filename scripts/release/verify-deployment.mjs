import nextEnv from "@next/env";
import { appUrl, check, fetchJson, gitInfo, releaseVersion, summarize, writeReport } from "./verification-utils.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });

const url = appUrl();
const git = gitInfo();
const expectedSha = process.env.EXPECTED_SHA || (git.dirty ? "" : git.sha);
const expectedBranch = process.env.EXPECTED_BRANCH || git.branch;
const expectedVersion = process.env.EXPECTED_VERSION || releaseVersion();
const checks = [];

if (!url) {
  checks.push(check("deployment:url", "ERROR", "Set PRODUCTION_URL or NEXT_PUBLIC_APP_URL."));
} else {
  await verify(url);
}

const { summary } = writeReport("DEPLOYMENT_VERIFICATION_REPORT", "Deployment Verification Report", checks);
console.log(`Deployment verification: ${JSON.stringify(summary.counts)}`);
process.exit(summarize(checks).exitCode);

async function verify(baseUrl) {
  const release = await safeFetch(`${baseUrl}/api/release-info`, "release-info");
  if (release?.json) {
    const data = release.json;
    checks.push(check("release:version", data.applicationVersion === expectedVersion ? "PASS" : "ERROR", `expected ${expectedVersion}, saw ${data.applicationVersion ?? "missing"}`));
    const hostedSha = data.currentCommitSha || data.buildCommit || data.commitSha;
    if (expectedSha) {
      checks.push(check("release:sha", matchesSha(hostedSha, expectedSha) ? "PASS" : "ERROR", `expected ${expectedSha}, saw ${hostedSha ?? "missing"}`));
    } else {
      checks.push(check("release:sha", "WARNING", `hosted currently serves ${hostedSha ?? "missing"}; final certification commit is pending and must be redeployed`));
    }
    checks.push(check("release:branch", String(data.currentBranch || data.releaseBranch) === expectedBranch ? "PASS" : "WARNING", `expected ${expectedBranch}`));
    checks.push(check("release:environment", data.deploymentEnvironment === "production" ? "PASS" : "ERROR", `saw ${data.deploymentEnvironment ?? "missing"}`));
    checks.push(check("release:timestamp", data.deploymentTimestamp || data.buildTimestamp ? "PASS" : "ERROR", "deployment timestamp present"));
    checks.push(check("release:runtime", data.runtimeVersion ? "PASS" : "ERROR", `runtime ${data.runtimeVersion ?? "missing"}`));
    checks.push(check("release:plugin-flags", flagsSafe(data.pluginFlags) ? "PASS" : "ERROR", "runtime dashboard/profiler disabled"));
  }

  const live = await safeFetch(`${baseUrl}/health/live`, "health-live");
  if (live?.json) checks.push(check("health:live-status", live.json.status === "ok" || live.json.status === "degraded" ? "PASS" : "ERROR", `status ${live.json.status ?? "missing"}`));

  const ready = await safeFetch(`${baseUrl}/health/ready`, "health-ready");
  if (ready?.json) {
    checks.push(check("health:ready-http", ready.ok ? "PASS" : "ERROR", `HTTP ${ready.status}`));
    checks.push(check("firebase:firestore", ready.json.firestoreConnectivity?.status === "connected" ? "PASS" : "ERROR", ready.json.firestoreConnectivity?.status ?? "missing"));
    checks.push(check("firebase:admin", ready.json.firebaseConfiguration?.adminConfigured ? "PASS" : "ERROR", "Firebase Admin configured"));
    checks.push(check("env:consistency", ready.json.deploymentEnvironment === release?.json?.deploymentEnvironment ? "PASS" : "WARNING", "release-info and health environment match"));
  }

  const startup = await safeFetch(`${baseUrl}/health/startup`, "health-startup");
  if (startup?.json) checks.push(check("health:startup", startup.ok ? "PASS" : "ERROR", `HTTP ${startup.status}`));
}

async function safeFetch(target, name) {
  try {
    const result = await fetchJson(target);
    checks.push(check(`http:${name}`, result.ok ? "PASS" : "ERROR", `${target} -> HTTP ${result.status}`));
    return result;
  } catch (error) {
    checks.push(check(`http:${name}`, "ERROR", error instanceof Error ? error.message : String(error)));
    return null;
  }
}

function matchesSha(actual, expected) {
  if (!actual || !expected || expected === "unknown") return false;
  return String(actual).startsWith(String(expected).slice(0, 12)) || String(expected).startsWith(String(actual).slice(0, 12));
}

function flagsSafe(flags = {}) {
  return flags.runtimeDashboard !== true && flags.profiler !== true;
}
