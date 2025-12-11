import { type NextRequest, NextResponse } from "next/server";

import { type Prisma } from "@prisma/client";
import { withAuth } from "@workos-inc/authkit-nextjs";

import { getWorkspaceContext } from "@/server/api/utils/authorization";
import { db } from "@/server/db";

/**
 * POST endpoint for sendBeacon saves during page unload.
 * This allows reliable saves for the systems canvas even when the user is navigating away.
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const auth = await withAuth();
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's workspace context (includes organization ID)
    const workspace = await getWorkspaceContext(auth.user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "No organization membership" },
        { status: 403 },
      );
    }

    // Parse the request body
    const body = (await request.json()) as {
      reactFlowNodes?: Prisma.InputJsonValue;
      reactFlowEdges?: Prisma.InputJsonValue;
    };

    // Upsert the systems canvas
    await db.systemsCanvas.upsert({
      where: { organizationId: workspace.organizationId },
      create: {
        organizationId: workspace.organizationId,
        reactFlowNodes: body.reactFlowNodes ?? [],
        reactFlowEdges: body.reactFlowEdges ?? [],
      },
      update: {
        ...(body.reactFlowNodes !== undefined && {
          reactFlowNodes: body.reactFlowNodes,
        }),
        ...(body.reactFlowEdges !== undefined && {
          reactFlowEdges: body.reactFlowEdges,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Systems canvas save error:", error);
    return NextResponse.json(
      { error: "Failed to save systems canvas" },
      { status: 500 },
    );
  }
}
