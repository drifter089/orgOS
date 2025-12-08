"use client";

import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import { api } from "@/trpc/react";

import { useTeamStore, useTeamStoreApi } from "../store/team-store";
import { serializeEdges, serializeNodes } from "../utils/canvas-serialization";

const AUTO_SAVE_DELAY = 2000; // 2 seconds

/**
 * Auto-save hook that debounces saves when the canvas state changes.
 * Includes beforeunload warning and flush-on-unmount to prevent data loss.
 */
export function useAutoSave() {
  const storeApi = useTeamStoreApi();
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

  // Flush save immediately (for unmount/beforeunload)
  const flushSave = useCallback(() => {
    const {
      isDirty: currentDirty,
      nodes: currentNodes,
      edges: currentEdges,
    } = storeApi.getState();

    if (!currentDirty) return;

    // Clear pending timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }

    // Use sendBeacon for reliable save during page unload
    const serializedNodes = serializeNodes(currentNodes);
    const serializedEdges = serializeEdges(currentEdges);

    const payload = JSON.stringify({
      id: teamId,
      reactFlowNodes: serializedNodes,
      reactFlowEdges: serializedEdges,
    });

    // Try sendBeacon first (works during unload), fall back to sync mutation
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(`/api/team-save?teamId=${teamId}`, payload);
    }
  }, [storeApi, teamId]);

  // Warn user before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { isDirty: currentDirty, isSaving } = storeApi.getState();
      if (currentDirty || isSaving) {
        // Flush save before leaving
        flushSave();
        // Show browser's default "unsaved changes" warning
        e.preventDefault();
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [storeApi, flushSave]);

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
