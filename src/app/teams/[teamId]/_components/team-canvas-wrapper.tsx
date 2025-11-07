"use client";

import React, { useEffect } from "react";

import { type TeamNode, useTeamStore } from "../store/team-store";
import { type StoredEdge } from "../types/canvas";
import { TeamCanvas } from "./team-canvas";

export function TeamCanvasWrapper({
  initialNodes,
  initialEdges,
}: {
  initialNodes: TeamNode[];
  initialEdges: StoredEdge[];
}) {
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const setInitialized = useTeamStore((state) => state.setInitialized);

  // Initialize store with server data
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);

    // Mark as initialized after a brief delay to allow React Flow to complete its initial setup
    // This prevents React Flow's internal operations (fitView, dimension calculations, etc.)
    // from triggering the dirty flag and causing unnecessary saves
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, setNodes, setEdges, setInitialized]);

  return <TeamCanvas />;
}
