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

  // Initialize store with server data
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return <TeamCanvas />;
}
