import Link from "next/link";
import { notFound } from "next/navigation";

import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <div className="flex h-screen w-full flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{team.name} - Roles</h1>
              <p className="text-muted-foreground text-sm">
                {team.description || "Team organization canvas"}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/teams/dashboard/${teamId}`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex w-full flex-1 overflow-hidden">
          {/* Main Canvas Area */}
          <div className="relative h-full w-full flex-1 overflow-hidden">
            {/* Canvas */}
            <TeamCanvasWrapper initialNodes={nodes} initialEdges={edges} />
          </div>

          {/* Right Sidebar (Sheet) - Closed by default to allow data prefetching */}
          <TeamSheetSidebar
            teamId={team.id}
            teamName={team.name}
            teamDescription={team.description}
            roleCount={team.roles.length}
          />
        </div>
      </div>
    </TeamStoreProvider>
  );
}
