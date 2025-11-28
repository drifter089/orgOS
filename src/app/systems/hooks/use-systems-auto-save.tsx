"use client";

import { useEffect, useRef } from "react";

import { toast } from "sonner";

import { api } from "@/trpc/react";

import { useSystemsStore } from "../store/systems-store";
import { serializeEdges, serializeNodes } from "../utils/canvas-serialization";

const AUTO_SAVE_DELAY = 2000;

export function useSystemsAutoSave() {
  const nodes = useSystemsStore((state) => state.nodes);
  const edges = useSystemsStore((state) => state.edges);
  const isDirty = useSystemsStore((state) => state.isDirty);
  const markClean = useSystemsStore((state) => state.markClean);
  const setSaving = useSystemsStore((state) => state.setSaving);
  const setLastSaved = useSystemsStore((state) => state.setLastSaved);

  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
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

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (!isDirty || updateCanvas.isPending) {
      return;
    }

    saveTimeoutRef.current = setTimeout(() => {
      setSaving(true);

      const serializedNodes = serializeNodes(nodes);
      const serializedEdges = serializeEdges(edges);

      pendingSnapshotRef.current = {
        nodes: serializedNodes,
        edges: serializedEdges,
      };

      updateCanvas.mutate({
        reactFlowNodes: serializedNodes,
        reactFlowEdges: serializedEdges,
      });
    }, AUTO_SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, nodes, edges, updateCanvas, setSaving, markClean, setLastSaved]);

  return {
    isSaving: updateCanvas.isPending,
    lastSaved: useSystemsStore((state) => state.lastSaved),
  };
}
