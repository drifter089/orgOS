import { HydrateClient, api } from "@/trpc/server";

import { DirectCacheUpdateDemo } from "./_components/DirectCacheUpdateDemo";
import { OptimisticUpdateDemo } from "./_components/OptimisticUpdateDemo";
import { QueryInvalidationDemo } from "./_components/QueryInvalidationDemo";
import { ServerTaskList } from "./_components/ServerTaskList";

export default async function RenderStrategyPage() {
  // Server-side data prefetching (direct function call, ~5ms)
  // This populates the TanStack Query cache before hydration
  await api.task.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="space-y-8">
        {/* Server Component displaying prefetched data */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">
            Server-Side Data Prefetching
          </h2>
          <ServerTaskList />
        </section>

        {/* Mutation Strategy Demos */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">
            Mutation Strategies Comparison
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <QueryInvalidationDemo />
            <DirectCacheUpdateDemo />
            <OptimisticUpdateDemo />
          </div>
        </section>
      </div>
    </HydrateClient>
  );
}
