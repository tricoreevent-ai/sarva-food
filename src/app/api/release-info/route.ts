import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/constants";
import { getBuildCommit } from "@/lib/server/build-info";

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
      buildCommit: getBuildCommit(),
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
