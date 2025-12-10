"use client";

import React, { useEffect } from "react";

import { ReactFlowProvider } from "@xyflow/react";
import { Lock } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
  shareToken: string | null;
  isPubliclyShared: boolean;
  isReadOnly?: boolean;
  editingUserName?: string | null;
  currentUserName?: string;
}

export function TeamCanvasWrapper({
  initialNodes,
  initialEdges,
  teamId,
  shareToken,
  isPubliclyShared,
  isReadOnly = false,
  editingUserName,
  currentUserName,
}: TeamCanvasWrapperProps) {
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const setInitialized = useTeamStore((state) => state.setInitialized);
  const utils = api.useUtils();

  // Manage edit session (acquire/heartbeat/release)
  useEditSession(teamId, isReadOnly, currentUserName);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);

    // Delay initialization to let React Flow complete setup without triggering dirty flag
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, setNodes, setEdges, setInitialized]);

  // Prefetch AI role suggestions (only if not read-only)
  useEffect(() => {
    if (!isReadOnly) {
      void utils.aiRole.generateSuggestions.prefetch({ teamId });
    }
  }, [teamId, isReadOnly, utils.aiRole.generateSuggestions]);

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        {/* Read-only banner when another user is editing */}
        {isReadOnly && editingUserName && (
          <div className="absolute top-4 left-1/2 z-30 -translate-x-1/2">
            <Alert className="border-amber-300 bg-amber-50 shadow-md">
              <Lock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <span className="font-medium">{editingUserName}</span> is
                currently editing this team. You can view but not make changes.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="absolute top-4 left-4 z-20">
          <ShareTeamDialog
            teamId={teamId}
            initialShareToken={shareToken}
            initialIsPubliclyShared={isPubliclyShared}
          />
        </div>

        <TeamCanvas isReadOnly={isReadOnly} />
      </div>
    </ReactFlowProvider>
  );
}
