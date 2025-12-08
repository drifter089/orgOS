import { type NextRequest, NextResponse } from "next/server";

import { type Prisma } from "@prisma/client";
import { withAuth } from "@workos-inc/authkit-nextjs";

import { getTeamAndVerifyAccess } from "@/server/api/utils/authorization";
import { db } from "@/server/db";

/**
 * POST endpoint for sendBeacon saves during page unload.
 * This allows reliable saves even when the user is navigating away.
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const auth = await withAuth();
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = (await request.json()) as {
      id: string;
      reactFlowNodes: Prisma.InputJsonValue;
      reactFlowEdges: Prisma.InputJsonValue;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Verify user has access to this team
    await getTeamAndVerifyAccess(db, body.id, auth.user.id);

    // Update the team
    await db.team.update({
      where: { id: body.id },
      data: {
        reactFlowNodes: body.reactFlowNodes,
        reactFlowEdges: body.reactFlowEdges,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team save error:", error);
    return NextResponse.json({ error: "Failed to save team" }, { status: 500 });
  }
}
