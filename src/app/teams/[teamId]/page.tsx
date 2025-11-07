import { notFound } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { api } from "@/trpc/server";

import { TeamCanvasWrapper } from "./_components/team-canvas-wrapper";
import { TeamSidebar } from "./_components/team-sidebar";
import { TeamSidebarTrigger } from "./_components/team-sidebar-trigger";
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

  // Default to open on desktop screens, closed on mobile
  // This provides better discoverability on larger screens
  const defaultSidebarOpen = true;

  return (
    <TeamStoreProvider teamId={team.id} teamName={team.name}>
      <SidebarProvider
        defaultOpen={defaultSidebarOpen}
        className="flex h-screen w-full overflow-hidden"
      >
        {/* Main Canvas Area with Inset for proper spacing */}
        <SidebarInset className="flex-1 overflow-hidden">
          <div className="relative h-full w-full">
            {/* Sidebar Trigger - Always visible in top-right */}
            <TeamSidebarTrigger
              roleCount={team.roles.length}
              className="absolute right-4 bottom-8 z-10"
            />

            {/* Canvas */}
            <TeamCanvasWrapper initialNodes={nodes} initialEdges={edges} />
          </div>
        </SidebarInset>

        {/* Right Sidebar */}
        <TeamSidebar
          teamId={team.id}
          teamName={team.name}
          teamDescription={team.description}
          roleCount={team.roles.length}
        />
      </SidebarProvider>
    </TeamStoreProvider>
  );
}
