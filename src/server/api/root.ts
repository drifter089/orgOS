import { adminPortalRouter } from "@/server/api/routers/admin-portal";
import { aiRoleRouter } from "@/server/api/routers/ai-role";
import { dashboardRouter } from "@/server/api/routers/dashboard";
import { editSessionRouter } from "@/server/api/routers/edit-session";
import { feedbackRouter } from "@/server/api/routers/feedback";
import { integrationRouter } from "@/server/api/routers/integration";
import { metricRouter } from "@/server/api/routers/metric";
import { organizationRouter } from "@/server/api/routers/organization";
import { publicViewRouter } from "@/server/api/routers/public-view";
import { roleRouter } from "@/server/api/routers/role";
import { teamRouter } from "@/server/api/routers/team";
import { transformerRouter } from "@/server/api/routers/transformer";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  team: teamRouter,
  role: roleRouter,
  aiRole: aiRoleRouter,
  metric: metricRouter,
  integration: integrationRouter,
  dashboard: dashboardRouter,
  feedback: feedbackRouter,
  publicView: publicViewRouter,
  adminPortal: adminPortalRouter,
  transformer: transformerRouter,
  editSession: editSessionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
