import { GeneratePortalLinkIntent } from "@workos-inc/node";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { workos } from "@/server/workos";

export const adminPortalRouter = createTRPCRouter({
  generateDirectorySetupLink: workspaceProcedure.mutation(async ({ ctx }) => {
    const { link } = await workos.portal.generateLink({
      organization: ctx.workspace.organizationId,
      intent: GeneratePortalLinkIntent.DSync,
      returnUrl: `${getBaseUrl()}/org`,
    });
    return { link };
  }),
});

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
