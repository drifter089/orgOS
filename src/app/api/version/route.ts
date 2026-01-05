import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";

/**
 * Get the current build ID for version checking.
 *
 * Priority:
 * 1. VERCEL_GIT_COMMIT_SHA (Vercel deployments)
 * 2. .next/BUILD_ID (local production builds)
 * 3. "development" (dev mode fallback)
 */
function getBuildId(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }

  try {
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    return fs.readFileSync(buildIdPath, "utf-8").trim();
  } catch {
    return "development";
  }
}

export async function GET() {
  const buildId = getBuildId();

  return NextResponse.json(
    { buildId },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
