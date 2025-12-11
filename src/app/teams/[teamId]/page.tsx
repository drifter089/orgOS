import Link from "next/link";
import { notFound } from "next/navigation";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/server";

import { DashboardSidebarWithDragDrop } from "./_components/dashboard-sidebar-with-drag-drop";
import { TeamCanvasWrapper } from "./_components/team-canvas-wrapper";
import { TeamSheetSidebar } from "./_components/team-sheet-sidebar";
import { ChartDragProvider } from "./context/chart-drag-context";
import { TeamStoreProvider } from "./store/team-store";
import { type StoredEdge, type StoredNode } from "./types/canvas";
import { enrichNodesWithRoleData } from "./utils/canvas-serialization";

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
  const [members, integrations, dashboardCharts] = await Promise.all([
    api.organization.getMembers().catch(() => []),
    api.integration.listWithStats().catch(() => ({
      active: [],
      stats: { total: 0, active: 0, byProvider: {} },
    })),
    api.dashboard.getDashboardCharts({ teamId }).catch(() => []),
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
  );

  const edges: StoredEdge[] = Array.isArray(team.reactFlowEdges)
    ? (team.reactFlowEdges as StoredEdge[])
    : [];

  // Parse viewport from JSON if available
  const initialViewport = team.viewport as {
    x: number;
    y: number;
    zoom: number;
  } | null;

  return (
    <TeamStoreProvider teamId={team.id} teamName={team.name}>
      <ChartDragProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <DashboardSidebarWithDragDrop
            teamId={team.id}
            initialIntegrations={integrations}
          />

          <div className="relative h-full w-full flex-1 overflow-hidden">
            <TeamCanvasWrapper
              initialNodes={nodes}
              initialEdges={edges}
              initialViewport={initialViewport}
              teamId={team.id}
              shareToken={team.shareToken}
              isPubliclyShared={team.isPubliclyShared}
            />
          </div>

          <TeamSheetSidebar
            teamId={team.id}
            teamName={team.name}
            teamDescription={team.description}
            roleCount={team.roles.length}
          />
        </div>
      </ChartDragProvider>
    </TeamStoreProvider>
  );
}
