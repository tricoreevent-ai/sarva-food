import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/constants";
import { getBuildCommit } from "@/lib/server/build-info";
import { getConfiguredPublicAppUrl } from "@/lib/server/public-app-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RELEASE_BRANCH = "release/production-nammude";
const RELEASE_MARKER = "nammude-production-release";
const APPLICATION_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0-rc1";

export function GET() {
  const buildCommit = getBuildCommit();
  const releaseBranch = process.env.HOSTINGER_GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.NEXT_PUBLIC_GIT_BRANCH || RELEASE_BRANCH;
  const buildTimestamp = process.env.NEXT_PUBLIC_BUILD_DATE || process.env.NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP || process.env.BUILD_DATE || new Date().toISOString();
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
      applicationVersion: APPLICATION_VERSION,
      buildTimestamp,
      deploymentEnvironment,
      publicAppUrl,
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
