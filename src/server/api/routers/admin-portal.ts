import { GeneratePortalLinkIntent } from "@workos-inc/node";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { workos } from "@/server/workos";

export const adminPortalRouter = createTRPCRouter({
  /**
   * Generate Admin Portal link for SSO setup.
   */
  generateSsoSetupLink: workspaceProcedure.mutation(async ({ ctx }) => {
    const { link } = await workos.portal.generateLink({
      organization: ctx.workspace.organizationId,
      intent: GeneratePortalLinkIntent.SSO,
      returnUrl: `${getBaseUrl()}/org/settings`,
    });
    return { link };
  }),

  /**
   * Generate Admin Portal link for Directory Sync setup.
   */
  generateDirectorySetupLink: workspaceProcedure.mutation(async ({ ctx }) => {
    const { link } = await workos.portal.generateLink({
      organization: ctx.workspace.organizationId,
      intent: GeneratePortalLinkIntent.DSync,
      returnUrl: `${getBaseUrl()}/org/settings`,
    });
    return { link };
  }),

  /**
   * Get current SSO and Directory Sync status.
   * All data from WorkOS - no local DB lookup.
   */
  getConnectionStatus: workspaceProcedure.query(async ({ ctx }) => {
    const [connections, directories] = await Promise.all([
      workos.sso.listConnections({
        organizationId: ctx.workspace.organizationId,
      }),
      workos.directorySync.listDirectories({
        organizationId: ctx.workspace.organizationId,
      }),
    ]);

    return {
      sso: {
        configured: connections.data.length > 0,
        connection: connections.data[0] ?? null,
      },
      directory: {
        configured: directories.data.length > 0,
        directory: directories.data[0] ?? null,
      },
    };
  }),
});

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
