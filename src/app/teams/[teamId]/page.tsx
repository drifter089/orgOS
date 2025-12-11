import { notFound } from "next/navigation";

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

  const [
    team,
    members,
    integrations,
    dashboardCharts,
    editSession,
    currentOrg,
  ] = await Promise.all([
    api.team.getById({ id: teamId }).catch(() => null),
    api.organization.getMembers().catch(() => []),
    api.integration.listWithStats().catch(() => ({
      active: [],
      stats: { total: 0, active: 0, byProvider: {} },
    })),
    api.dashboard.getDashboardCharts({ teamId }).catch(() => []),
    api.editSession
      .check({ teamId })
      .catch(() => ({ canEdit: true, editingUserName: null })),
    api.organization.getCurrent().catch(() => null),
  ]);

  if (!team) {
    notFound();
  }

  // Get current user's display name
  const currentUserName = currentOrg?.currentUser
    ? currentOrg.currentUser.firstName && currentOrg.currentUser.lastName
      ? `${currentOrg.currentUser.firstName} ${currentOrg.currentUser.lastName}`
      : (currentOrg.currentUser.firstName ?? currentOrg.currentUser.email)
    : undefined;

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

  return (
    <TeamStoreProvider teamId={team.id} teamName={team.name}>
      <ChartDragProvider>
        <div className="flex h-screen w-full overflow-hidden">
          {/* Left Sidebar - KPI Management (with drag-drop support) */}
          <DashboardSidebarWithDragDrop
            teamId={team.id}
            initialIntegrations={integrations}
          />

          {/* Main Canvas Area */}
          <div className="relative h-full w-full flex-1 overflow-hidden">
            <TeamCanvasWrapper
              initialNodes={nodes}
              initialEdges={edges}
              teamId={team.id}
              shareToken={team.shareToken}
              isPubliclyShared={team.isPubliclyShared}
              isReadOnly={!editSession.canEdit}
              editingUserName={editSession.editingUserName}
              currentUserName={currentUserName}
            />
          </div>

          {/* Right Sidebar - Roles Management */}
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
