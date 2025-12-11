"use client";

import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import { useCanvasAutoSave } from "@/lib/canvas";
import { api } from "@/trpc/react";

import { useSystemsStore, useSystemsStoreApi } from "../store/systems-store";
import { serializeEdges, serializeNodes } from "../utils/canvas-serialization";

/**
 * Auto-save hook for systems canvas with debounced saves.
 * Includes beforeunload warning to prevent data loss.
 */
export function useSystemsAutoSave() {
  const storeApi = useSystemsStoreApi();
  const nodes = useSystemsStore((state) => state.nodes);
  const edges = useSystemsStore((state) => state.edges);
  const isDirty = useSystemsStore((state) => state.isDirty);
  const markClean = useSystemsStore((state) => state.markClean);
  const setSaving = useSystemsStore((state) => state.setSaving);
  const setLastSaved = useSystemsStore((state) => state.setLastSaved);
  const lastSaved = useSystemsStore((state) => state.lastSaved);

  const pendingSnapshotRef = useRef<{
    nodes: ReturnType<typeof serializeNodes>;
    edges: ReturnType<typeof serializeEdges>;
  } | null>(null);

  const updateCanvas = api.systemsCanvas.update.useMutation({
    onSuccess: () => {
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
      toast.error("Failed to save canvas", {
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
        pendingSnapshotRef.current = {
          nodes: data.reactFlowNodes,
          edges: data.reactFlowEdges,
        };
        updateCanvas.mutate({
          reactFlowNodes: data.reactFlowNodes,
          reactFlowEdges: data.reactFlowEdges,
        });
      },
      isPending: updateCanvas.isPending,
    },
  });

  // Flush save immediately (for beforeunload)
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

    const payload = JSON.stringify({
      reactFlowNodes: serializedNodes,
      reactFlowEdges: serializedEdges,
    });

    // Use sendBeacon for reliable save during unload
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/systems-canvas-save", payload);
    }
  }, [storeApi]);

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
