import { HydrateClient, api } from "@/trpc/server";

import { CreateTeamDialog } from "./_components/create-team-dialog";
import { TeamsList } from "./_components/teams-list";

export default async function TeamsPage() {
  // Prefetch teams data for instant SSR + hydration
  await api.team.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Teams
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Manage your team role structures and workflows
            </p>
          </div>
          <div className="shrink-0">
            <CreateTeamDialog />
          </div>
        </div>

        <TeamsList />
      </div>
    </HydrateClient>
  );
}
