"use client";

import React, { useEffect } from "react";

import { ReactFlowProvider } from "@xyflow/react";

import { api } from "@/trpc/react";

import { useEditSession } from "../hooks/use-edit-session";
import { type TeamNode, useTeamStore } from "../store/team-store";
import { type StoredEdge } from "../types/canvas";
import { ShareTeamDialog } from "./share-team-dialog";
import { TeamCanvas } from "./team-canvas";

interface TeamCanvasWrapperProps {
  initialNodes: TeamNode[];
  initialEdges: StoredEdge[];
  teamId: string;
}

export function TeamCanvasWrapper({
  initialNodes,
  initialEdges,
  teamId,
}: TeamCanvasWrapperProps) {
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const utils = api.useUtils();

  // Manage edit session (acquire/heartbeat/release)
  useEditSession(teamId);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    void utils.aiRole.generateSuggestions.prefetch({ teamId });
  }, [teamId, utils.aiRole.generateSuggestions]);

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <div className="absolute top-4 left-4 z-20">
          <ShareTeamDialog teamId={teamId} />
        </div>

        <TeamCanvas />
      </div>
    </ReactFlowProvider>
  );
}
