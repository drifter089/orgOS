import { dashboardRouter } from "@/server/api/routers/dashboard";
import { feedbackRouter } from "@/server/api/routers/feedback";
import { integrationRouter } from "@/server/api/routers/integration";
import { metricRouter } from "@/server/api/routers/metric";
import { metricIntegrationRouter } from "@/server/api/routers/metric-integration";
import { organizationRouter } from "@/server/api/routers/organization";
import { roleRouter } from "@/server/api/routers/role";
import { taskRouter } from "@/server/api/routers/task";
import { teamRouter } from "@/server/api/routers/team";
import { youtubeRouter } from "@/server/api/routers/youtube";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  task: taskRouter,
  organization: organizationRouter,
  team: teamRouter,
  role: roleRouter,
  metric: metricRouter,
  metricIntegration: metricIntegrationRouter,
  integration: integrationRouter,
  dashboard: dashboardRouter,
  youtube: youtubeRouter,
  feedback: feedbackRouter,
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
