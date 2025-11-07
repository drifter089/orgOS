import { notFound } from "next/navigation";

import { SidebarProvider } from "@/components/ui/sidebar";
import { api } from "@/trpc/server";

import { TeamCanvasWrapper } from "./_components/team-canvas-wrapper";
import { TeamSidebar } from "./_components/team-sidebar";
import { TeamStoreProvider } from "./store/team-store";
import { type StoredEdge, type StoredNode } from "./types/canvas";
import { enrichNodesWithRoleData } from "./utils/canvas-serialization";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  // Fetch team data from server
  const team = await api.team.getById({ id: teamId }).catch(() => null);

  if (!team) {
    notFound();
  }

  // Parse React Flow nodes and enrich with role data
  const storedNodes: StoredNode[] = Array.isArray(team.reactFlowNodes)
    ? (team.reactFlowNodes as StoredNode[])
    : [];

  const nodes = enrichNodesWithRoleData(storedNodes, team.roles);

  const edges: StoredEdge[] = Array.isArray(team.reactFlowEdges)
    ? (team.reactFlowEdges as StoredEdge[])
    : [];

  return (
    <TeamStoreProvider teamId={team.id} teamName={team.name}>
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-screen w-full overflow-hidden">
          {/* Main Canvas Area */}
          <div className="flex-1 overflow-hidden">
            <TeamCanvasWrapper initialNodes={nodes} initialEdges={edges} />
          </div>

          {/* Right Sidebar */}
          <TeamSidebar
            teamId={team.id}
            teamName={team.name}
            teamDescription={team.description}
            roleCount={team.roles.length}
          />
        </div>
      </SidebarProvider>
    </TeamStoreProvider>
  );
}
