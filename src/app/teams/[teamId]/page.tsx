import { notFound } from "next/navigation";

import { DashboardSidebar } from "@/app/dashboard/[teamId]/_components/dashboard-sidebar";
import { api } from "@/trpc/server";

import { TeamCanvasWrapper } from "./_components/team-canvas-wrapper";
import { TeamSheetSidebar } from "./_components/team-sheet-sidebar";
import { TeamStoreProvider } from "./store/team-store";
import { type StoredEdge, type StoredNode } from "./types/canvas";
import { enrichNodesWithRoleData } from "./utils/canvas-serialization";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const [team, members, integrations] = await Promise.all([
    api.team.getById({ id: teamId }).catch(() => null),
    api.organization.getCurrentOrgMembers().catch(() => []),
    api.integration.listWithStats().catch(() => ({
      active: [],
      stats: { total: 0, active: 0, byProvider: {} },
    })),
  ]);

  if (!team) {
    notFound();
  }

  const userNameMap = new Map<string, string>();
  for (const member of members) {
    const name =
      member.user.firstName && member.user.lastName
        ? `${member.user.firstName} ${member.user.lastName}`
        : (member.user.firstName ?? member.user.email ?? undefined);
    if (name) {
      userNameMap.set(member.user.id, name);
    }
  }

  const storedNodes: StoredNode[] = Array.isArray(team.reactFlowNodes)
    ? (team.reactFlowNodes as StoredNode[])
    : [];

  const nodes = enrichNodesWithRoleData(storedNodes, team.roles, userNameMap);

  const edges: StoredEdge[] = Array.isArray(team.reactFlowEdges)
    ? (team.reactFlowEdges as StoredEdge[])
    : [];

  return (
    <TeamStoreProvider teamId={team.id} teamName={team.name}>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Left Sidebar - KPI Management */}
        <DashboardSidebar
          teamId={team.id}
          initialIntegrations={integrations}
          side="left"
        />

        {/* Main Canvas Area */}
        <div className="relative h-full w-full flex-1 overflow-hidden">
          <TeamCanvasWrapper
            initialNodes={nodes}
            initialEdges={edges}
            teamId={team.id}
            shareToken={team.shareToken}
            isPubliclyShared={team.isPubliclyShared}
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
    </TeamStoreProvider>
  );
}
