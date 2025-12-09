"use client";

import React, { useEffect } from "react";

import { ReactFlowProvider } from "@xyflow/react";

import { api } from "@/trpc/react";

import { type TeamNode, useTeamStore } from "../store/team-store";
import { type StoredEdge } from "../types/canvas";
import { ShareTeamDialog } from "./share-team-dialog";
import { TeamCanvas } from "./team-canvas";

interface TeamCanvasWrapperProps {
  initialNodes: TeamNode[];
  initialEdges: StoredEdge[];
  teamId: string;
  shareToken: string | null;
  isPubliclyShared: boolean;
}

export function TeamCanvasWrapper({
  initialNodes,
  initialEdges,
  teamId,
  shareToken,
  isPubliclyShared,
}: TeamCanvasWrapperProps) {
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const setInitialized = useTeamStore((state) => state.setInitialized);
  const utils = api.useUtils();

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);

    // Delay initialization to let React Flow complete setup without triggering dirty flag
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, setNodes, setEdges, setInitialized]);

  // Prefetch AI role suggestions
  useEffect(() => {
    void utils.aiRole.generateSuggestions.prefetch({ teamId });
  }, [teamId, utils.aiRole.generateSuggestions]);

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <div className="absolute top-4 left-4 z-20">
          <ShareTeamDialog
            teamId={teamId}
            initialShareToken={shareToken}
            initialIsPubliclyShared={isPubliclyShared}
          />
        </div>

        <TeamCanvas />
      </div>
    </ReactFlowProvider>
  );
}
