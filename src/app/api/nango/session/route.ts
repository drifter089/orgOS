import { NextResponse } from "next/server";

import { Nango } from "@nangohq/node";
import { withAuth } from "@workos-inc/authkit-nextjs";

import { env } from "@/env";
import { getWorkspaceContext } from "@/server/api/utils/authorization";

export async function POST() {
  try {
    // Get user from WorkOS
    const auth = await withAuth();
    const user = auth.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getWorkspaceContext(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    if (!env.NANGO_SECRET_KEY_DEV) {
      console.error("[Nango Session] NANGO_SECRET_KEY_DEV is not configured");
      return NextResponse.json(
        { error: "Nango secret key not configured" },
        { status: 500 },
      );
    }

    const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

    const session = await nango.createConnectSession({
      end_user: {
        id: user.id,
        email: user.email,
        display_name: `${user.firstName} ${user.lastName}`,
        tags: {
          organizationId: workspace.organizationId,
        },
      },
    });

    return NextResponse.json({ sessionToken: session.data.token });
  } catch (error) {
    console.error("[Nango Session] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return NextResponse.json(
      {
        error: "Failed to create session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
