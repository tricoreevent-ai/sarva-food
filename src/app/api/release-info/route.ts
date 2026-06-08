import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RELEASE_BRANCH = "release/production-nammude";
const RELEASE_MARKER = "nammude-production-release";

export function GET() {
  return NextResponse.json(
    {
      appName: APP_NAME,
      releaseBranch: RELEASE_BRANCH,
      releaseMarker: RELEASE_MARKER,
      buildCommit:
        process.env.HOSTINGER_GIT_COMMIT_SHA ||
        process.env.GIT_COMMIT_SHA ||
        process.env.NEXT_PUBLIC_BUILD_COMMIT ||
        "unknown",
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
