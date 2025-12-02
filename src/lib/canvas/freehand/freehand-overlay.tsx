"use client";

import { type PointerEvent, useRef, useState } from "react";

import { useReactFlow } from "@xyflow/react";

import { pathOptions, pointsToPath } from "./path-utils";
import type { FreehandNode, Points } from "./types";

/**
 * Process raw screen points into flow coordinates and calculate bounds.
 */
function processPoints(
  points: Points,
  screenToFlowPosition: ReturnType<typeof useReactFlow>["screenToFlowPosition"],
) {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;

  const flowPoints: Points = [];

  for (const point of points) {
    const { x, y } = screenToFlowPosition({ x: point[0], y: point[1] });
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);

    flowPoints.push([x, y, point[2]]);
  }

  // Correct for the thickness of the line
  const thickness = pathOptions.size * 0.5;
  x1 -= thickness;
  y1 -= thickness;
  x2 += thickness;
  y2 += thickness;

  // Normalize points to be relative to the node position
  for (const flowPoint of flowPoints) {
    flowPoint[0] -= x1;
    flowPoint[1] -= y1;
  }

  const width = x2 - x1;
  const height = y2 - y1;

  return {
    position: { x: x1, y: y1 },
    width,
    height,
    data: { points: flowPoints, initialSize: { width, height } },
  };
}

type FreehandOverlayProps = {
  /** Callback when a drawing is complete. Receives the new node to add. */
  onDrawingComplete: (node: FreehandNode) => void;
};

/**
 * Overlay component for capturing freehand drawing input.
 * Renders on top of the React Flow canvas when drawing mode is active.
 */
export function FreehandOverlay({ onDrawingComplete }: FreehandOverlayProps) {
  const { screenToFlowPosition, getViewport } = useReactFlow();

  const pointRef = useRef<Points>([]);
  const [points, setPoints] = useState<Points>([]);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
    const nextPoints = [
      ...points,
      [e.pageX, e.pageY, e.pressure],
    ] satisfies Points;
    pointRef.current = nextPoints;
    setPoints(nextPoints);
  }

  function handlePointerMove(e: PointerEvent) {
    if (e.buttons !== 1) return;
    const currentPoints = pointRef.current;
    const nextPoints = [
      ...currentPoints,
      [e.pageX, e.pageY, e.pressure],
    ] satisfies Points;
    pointRef.current = nextPoints;
    setPoints(nextPoints);
  }

  function handlePointerUp(e: PointerEvent) {
    (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);

    // Only create node if we have enough points for a meaningful stroke
    if (points.length > 2) {
      const newNode: FreehandNode = {
        id: crypto.randomUUID(),
        type: "freehand",
        ...processPoints(points, screenToFlowPosition),
      };

      onDrawingComplete(newNode);
    }

    setPoints([]);
    pointRef.current = [];
  }

  return (
    <div
      className="freehand-overlay"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        cursor: "crosshair",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={points.length > 0 ? handlePointerMove : undefined}
      onPointerUp={handlePointerUp}
    >
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {points.length > 0 && (
          <path
            d={pointsToPath(points, getViewport().zoom)}
            fill="currentColor"
            className="text-foreground"
          />
        )}
      </svg>
    </div>
  );
}
