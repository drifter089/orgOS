import { metricRouter } from "@/server/api/routers/metric";
import { organizationRouter } from "@/server/api/routers/organization";
import { postRouter } from "@/server/api/routers/post";
import { roleRouter } from "@/server/api/routers/role";
import { taskRouter } from "@/server/api/routers/task";
import { teamRouter } from "@/server/api/routers/team";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  task: taskRouter,
  organization: organizationRouter,
  team: teamRouter,
  role: roleRouter,
  metric: metricRouter,
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
