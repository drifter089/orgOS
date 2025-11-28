"use client";

import { useCallback, useEffect, useRef } from "react";

import { useShallow } from "zustand/react/shallow";

import { type SystemsStore, useSystemsStore } from "../store/systems-store";

const AUTO_SAVE_DELAY = 1000;
const STORAGE_KEY = "systems-canvas-state";

type StoredState = {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
    animated?: boolean;
  }>;
};

const selector = (state: SystemsStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  isDirty: state.isDirty,
  markClean: state.markClean,
  setSaving: state.setSaving,
  setLastSaved: state.setLastSaved,
});

export function useSystemsAutoSave() {
  const { nodes, edges, isDirty, markClean, setSaving, setLastSaved } =
    useSystemsStore(useShallow(selector));

  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isSavingRef = useRef(false);

  const saveToStorage = useCallback(() => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setSaving(true);

    try {
      const storedState: StoredState = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type ?? "metricCard",
          position: node.position,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: edge.type,
          animated: edge.animated,
        })),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState));
      markClean();
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save systems canvas:", error);
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }, [nodes, edges, markClean, setSaving, setLastSaved]);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (!isDirty) return;

    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, saveToStorage]);

  const isSaving = useSystemsStore((state) => state.isSaving);
  const lastSaved = useSystemsStore((state) => state.lastSaved);

  return { isSaving, lastSaved };
}

export function loadSystemsCanvasState(): StoredState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredState;
  } catch {
    return null;
  }
}
