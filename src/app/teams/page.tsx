import { api } from "@/trpc/server";

import { CreateTeamDialog } from "./_components/create-team-dialog";
import { TeamsList } from "./_components/teams-list";

export default async function TeamsPage() {
  // Prefetch teams data for instant SSR + hydration
  await api.team.getAll.prefetch();

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage your team role structures and workflows
          </p>
        </div>
        <CreateTeamDialog />
      </div>

      {/* Teams Grid - Client Component for Real-time Updates */}
      <TeamsList />
    </div>
  );
}
