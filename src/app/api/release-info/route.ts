import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/constants";
import { RELEASE_BRANCH, RELEASE_MARKER, RELEASE_VERSION } from "@/lib/release";
import { getBuildCommit, getBuildTimestamp } from "@/lib/server/build-info";
import { getConfiguredPublicAppUrl } from "@/lib/server/public-app-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const buildCommit = getBuildCommit();
  const releaseBranch = process.env.HOSTINGER_GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.NEXT_PUBLIC_GIT_BRANCH || RELEASE_BRANCH;
  const buildTimestamp = getBuildTimestamp();
  const deploymentEnvironment = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "production";
  const publicAppUrl = getConfiguredPublicAppUrl();

  return NextResponse.json(
    {
      appName: APP_NAME,
      releaseBranch,
      currentBranch: releaseBranch,
      releaseMarker: RELEASE_MARKER,
      buildCommit,
      currentCommitSha: buildCommit,
      commitSha: buildCommit,
      applicationVersion: process.env.NEXT_PUBLIC_APP_VERSION || RELEASE_VERSION,
      buildTimestamp,
      deploymentTimestamp: buildTimestamp,
      deploymentEnvironment,
      publicAppUrl,
      runtimeVersion: process.version,
      nodeEnv: process.env.NODE_ENV || "production",
      pluginFlags: {
        qualityDiagnostics: process.env.NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS === "true",
        runtimeDashboard: process.env.NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD === "true",
        profiler: process.env.NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER === "true",
        performanceDiagnostics: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_DIAGNOSTICS !== "false",
      },
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Surrogate-Control": "no-store",
      },
    },
  );
}
