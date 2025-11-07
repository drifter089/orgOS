import { HydrateClient, api } from "@/trpc/server";

import { CreateTeamDialog } from "./_components/create-team-dialog";
import { TeamsList } from "./_components/teams-list";

export default async function TeamsPage() {
  // Prefetch teams data for instant SSR + hydration
  await api.team.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Teams</h1>
            <p className="text-muted-foreground text-lg">
              Manage your team role structures and workflows
            </p>
          </div>
          <div className="flex-shrink-0">
            <CreateTeamDialog />
          </div>
        </div>

        {/* Teams Grid - Client Component for Real-time Updates */}
        <TeamsList />
      </div>
    </HydrateClient>
  );
}
