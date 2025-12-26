import Link from "next/link";
import { notFound } from "next/navigation";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HydrateClient, api } from "@/trpc/server";

import { CanvasQuickActions } from "./_components/canvas-quick-actions";
import { CanvasSidePanels } from "./_components/canvas-side-panels";
import { TeamCanvasWrapper } from "./_components/team-canvas-wrapper";
import { ChartDragProvider } from "./context/chart-drag-context";
import { TeamStoreProvider } from "./store/team-store";
import { type StoredEdge, type StoredNode } from "./types/canvas";
import { enrichNodesWithRoleData } from "./utils/canvas-serialization";
import { generateMetricEdges } from "./utils/generate-metric-edges";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const [team, editSession] = await Promise.all([
    api.team.getById({ id: teamId }).catch(() => null),
    api.editSession
      .check({ teamId })
      .catch(() => ({ canEdit: true, editingUserName: null })),
  ]);

  if (!team) {
    notFound();
  }

  // Show blocking page if another user is editing
  if (!editSession.canEdit) {
    return (
      <div className="to-background flex h-screen w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-amber-50/50">
        <div className="rounded-full bg-amber-100 p-6">
          <Lock className="h-12 w-12 text-amber-600" />
        </div>
        <div className="text-center">
          <h1 className="text-foreground text-2xl font-bold">
            Team is Currently Being Edited
          </h1>
          <p className="text-muted-foreground mt-2">
            <span className="font-medium text-amber-700">
              {editSession.editingUserName ?? "Another user"}
            </span>{" "}
            is currently editing this team.
          </p>
          <p className="text-muted-foreground">
            Please wait for them to finish or try again later.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/teams">Back to Teams</Link>
        </Button>
      </div>
    );
  }

  // Fetch additional data only when user can edit
  // Fetch roles with metricId for auto-edge generation, also hydrated to client cache
  const [members, integrations, dashboardCharts, roles] = await Promise.all([
    api.organization.getMembers().catch(() => []),
    api.integration.listWithStats().catch(() => ({
      active: [],
      stats: { total: 0, active: 0, byProvider: {} },
    })),
    api.dashboard.getDashboardCharts({ teamId }).catch(() => []),
    api.role.getByTeamId({ teamId }).catch(() => []),
    api.organization.getMembers.prefetch(),
    api.role.getByTeamId.prefetch({ teamId }), // Hydrate to client cache for useRoleData
  ]);

  const userNameMap = new Map<string, string>();
  for (const member of members) {
    const name =
      member.firstName && member.lastName
        ? `${member.firstName} ${member.lastName}`
        : (member.firstName ?? member.email ?? undefined);
    if (name) {
      userNameMap.set(member.id, name);
    }
  }

  const storedNodes: StoredNode[] = Array.isArray(team.reactFlowNodes)
    ? (team.reactFlowNodes as StoredNode[])
    : [];

  const nodes = enrichNodesWithRoleData(
    storedNodes,
    team.roles,
    userNameMap,
    dashboardCharts,
    teamId,
  );

  const storedEdges: StoredEdge[] = Array.isArray(team.reactFlowEdges)
    ? (team.reactFlowEdges as StoredEdge[])
    : [];

  // Generate KPI edges for roles that have metrics assigned
  // This ensures existing role-metric assignments from database are visualized on canvas
  const edges = generateMetricEdges(
    storedNodes,
    storedEdges,
    roles,
    dashboardCharts,
  );

  // Parse viewport from JSON if available
  const initialViewport = team.viewport as {
    x: number;
    y: number;
    zoom: number;
  } | null;

  return (
    <HydrateClient>
      <TeamStoreProvider
        teamId={team.id}
        teamName={team.name}
        initialViewport={initialViewport}
      >
        <ChartDragProvider>
          <div className="relative h-screen w-full overflow-hidden">
            <TeamCanvasWrapper
              initialNodes={nodes}
              initialEdges={edges}
              teamId={team.id}
            />

            <CanvasQuickActions
              teamId={team.id}
              initialIntegrations={integrations}
            />

            <CanvasSidePanels
              teamId={team.id}
              teamName={team.name}
              roleCount={team.roles.length}
              members={members}
              initialIntegrations={integrations}
            />
          </div>
        </ChartDragProvider>
      </TeamStoreProvider>
    </HydrateClient>
  );
}
