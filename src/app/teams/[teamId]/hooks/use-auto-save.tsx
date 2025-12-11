"use client";

import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import { useCanvasAutoSave } from "@/lib/canvas";
import { api } from "@/trpc/react";

import { useTeamStore, useTeamStoreApi } from "../store/team-store";
import { serializeEdges, serializeNodes } from "../utils/canvas-serialization";

type Viewport = { x: number; y: number; zoom: number };

/**
 * Auto-save hook that debounces saves when the canvas state changes.
 * Includes beforeunload warning and flush-on-unmount to prevent data loss.
 * Also persists viewport state.
 */
export function useAutoSave() {
  const storeApi = useTeamStoreApi();
  const teamId = useTeamStore((state) => state.teamId);
  const utils = api.useUtils();
  const nodes = useTeamStore((state) => state.nodes);
  const edges = useTeamStore((state) => state.edges);
  const isDirty = useTeamStore((state) => state.isDirty);
  const markClean = useTeamStore((state) => state.markClean);
  const setSaving = useTeamStore((state) => state.setSaving);
  const setLastSaved = useTeamStore((state) => state.setLastSaved);
  const lastSaved = useTeamStore((state) => state.lastSaved);

  const pendingSnapshotRef = useRef<{
    nodes: ReturnType<typeof serializeNodes>;
    edges: ReturnType<typeof serializeEdges>;
    viewport?: Viewport;
  } | null>(null);

  /** Get current viewport from React Flow instance */
  const getCurrentViewport = useCallback((): Viewport | undefined => {
    const instance = storeApi.getState().reactFlowInstance;
    return instance?.getViewport();
  }, [storeApi]);

  const updateTeam = api.team.update.useMutation({
    onSuccess: () => {
      void utils.team.getById.invalidate({ id: teamId });

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

  // Use shared auto-save hook for core save logic
  const { isSaving } = useCanvasAutoSave({
    nodes,
    edges,
    isDirty,
    markClean,
    setSaving,
    setLastSaved,
    serializeNodes,
    serializeEdges,
    mutation: {
      mutate: (data) => {
        const viewport = getCurrentViewport();
        pendingSnapshotRef.current = {
          nodes: data.reactFlowNodes,
          edges: data.reactFlowEdges,
          viewport,
        };
        updateTeam.mutate({
          id: teamId,
          reactFlowNodes: data.reactFlowNodes,
          reactFlowEdges: data.reactFlowEdges,
          viewport,
        });
      },
      isPending: updateTeam.isPending,
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

    // Use sendBeacon for reliable save during page unload
    const serializedNodes = serializeNodes(currentNodes);
    const serializedEdges = serializeEdges(currentEdges);
    const viewport = getCurrentViewport();

    const payload = JSON.stringify({
      id: teamId,
      reactFlowNodes: serializedNodes,
      reactFlowEdges: serializedEdges,
      viewport,
    });

    // Try sendBeacon first (works during unload)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(`/api/team-save?teamId=${teamId}`, payload);
    }
  }, [storeApi, teamId, getCurrentViewport]);

  // Warn user before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { isDirty: currentDirty, isSaving: currentSaving } =
        storeApi.getState();
      if (currentDirty || currentSaving) {
        flushSave();
        e.preventDefault();
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [storeApi, flushSave]);

  return {
    isSaving,
    lastSaved,
  };
}
