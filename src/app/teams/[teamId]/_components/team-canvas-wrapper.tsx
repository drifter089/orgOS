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
  initialViewport?: { x: number; y: number; zoom: number } | null;
  teamId: string;
  shareToken: string | null;
  isPubliclyShared: boolean;
}

export function TeamCanvasWrapper({
  initialNodes,
  initialEdges,
  initialViewport,
  teamId,
  shareToken,
  isPubliclyShared,
}: TeamCanvasWrapperProps) {
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const setSavedViewport = useTeamStore((state) => state.setSavedViewport);
  const utils = api.useUtils();

  // Manage edit session (acquire/heartbeat/release)
  useEditSession(teamId);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    if (initialViewport) {
      setSavedViewport(initialViewport);
    }
    // setInitialized is called by onInit in TeamCanvas for proper timing
  }, [
    initialNodes,
    initialEdges,
    initialViewport,
    setNodes,
    setEdges,
    setSavedViewport,
  ]);

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
