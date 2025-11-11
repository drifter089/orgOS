import { NextResponse } from "next/server";

import { Nango } from "@nangohq/node";
import { withAuth } from "@workos-inc/authkit-nextjs";

import { env } from "@/env";

export async function POST() {
  try {
    // Get user from WorkOS
    const auth = await withAuth();
    const user = auth.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

    const session = await nango.createConnectSession({
      end_user: {
        id: user.id,
        email: user.email,
        display_name: `${user.firstName} ${user.lastName}`,
      },
      // Remove integration restriction to allow all configured integrations
      // allowed_integrations: ['github', 'google'],
    });

    return NextResponse.json({ sessionToken: session.data.token });
  } catch (error) {
    console.error("Nango session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
