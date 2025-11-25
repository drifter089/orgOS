"use client";

import { useEffect, useRef } from "react";

import { toast } from "sonner";

import { api } from "@/trpc/react";

import { useTeamStore } from "../store/team-store";
import { serializeEdges, serializeNodes } from "../utils/canvas-serialization";

const AUTO_SAVE_DELAY = 2000; // 2 seconds

/**
 * Auto-save hook that debounces saves when the canvas state changes
 */
export function useAutoSave() {
  const teamId = useTeamStore((state) => state.teamId);
  const nodes = useTeamStore((state) => state.nodes);
  const edges = useTeamStore((state) => state.edges);
  const isDirty = useTeamStore((state) => state.isDirty);
  const markClean = useTeamStore((state) => state.markClean);
  const setSaving = useTeamStore((state) => state.setSaving);
  const setLastSaved = useTeamStore((state) => state.setLastSaved);

  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingSnapshotRef = useRef<{
    nodes: ReturnType<typeof serializeNodes>;
    edges: ReturnType<typeof serializeEdges>;
  } | null>(null);

  const updateTeam = api.team.update.useMutation({
    onSuccess: () => {
      // Only mark clean if no changes happened since we started saving
      const lastSent = pendingSnapshotRef.current;
      const currentSnapshot = {
        nodes: serializeNodes(nodes),
        edges: serializeEdges(edges),
      };

      const mutatedWhileSaving =
        !lastSent ||
        JSON.stringify(lastSent.nodes) !==
          JSON.stringify(currentSnapshot.nodes) ||
        JSON.stringify(lastSent.edges) !==
          JSON.stringify(currentSnapshot.edges);

      if (!mutatedWhileSaving) {
        markClean();
        setLastSaved(new Date());
      }
    },
    onError: (error) => {
      toast.error("Failed to save team", {
        description: error.message ?? "Changes could not be saved",
      });
    },
    onSettled: () => {
      setSaving(false);
      pendingSnapshotRef.current = null;
    },
  });

  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't save if not dirty or already saving
    if (!isDirty || updateTeam.isPending) {
      return;
    }

    // Debounce: save after 2 seconds of no changes
    saveTimeoutRef.current = setTimeout(() => {
      setSaving(true);

      // Serialize nodes and edges for storage
      const serializedNodes = serializeNodes(nodes);
      const serializedEdges = serializeEdges(edges);

      // Store snapshot of what we're sending
      pendingSnapshotRef.current = {
        nodes: serializedNodes,
        edges: serializedEdges,
      };

      updateTeam.mutate({
        id: teamId,
        reactFlowNodes: serializedNodes,
        reactFlowEdges: serializedEdges,
      });
    }, AUTO_SAVE_DELAY);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    isDirty,
    nodes,
    edges,
    teamId,
    updateTeam,
    setSaving,
    markClean,
    setLastSaved,
  ]);

  return {
    isSaving: updateTeam.isPending,
    lastSaved: useTeamStore((state) => state.lastSaved),
  };
}
