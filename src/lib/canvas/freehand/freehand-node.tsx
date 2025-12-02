"use client";

import { useMemo } from "react";

import { type NodeProps, NodeResizer } from "@xyflow/react";

import { pointsToPath } from "./path-utils";
import type { FreehandNode as FreehandNodeType, Points } from "./types";

/**
 * Custom React Flow node component for rendering freehand drawings.
 * Supports resizing and scales the SVG path accordingly.
 */
export function FreehandNode({
  data,
  width,
  height,
  selected,
  dragging,
}: NodeProps<FreehandNodeType>) {
  const scaleX = (width ?? 1) / data.initialSize.width;
  const scaleY = (height ?? 1) / data.initialSize.height;

  const scaledPoints = useMemo(
    () =>
      data.points.map((point) => [
        point[0] * scaleX,
        point[1] * scaleY,
        point[2],
      ]) satisfies Points,
    [data.points, scaleX, scaleY],
  );

  return (
    <>
      <NodeResizer isVisible={selected && !dragging} />
      <svg
        width={width}
        height={height}
        style={{
          pointerEvents: selected ? "auto" : "none",
          overflow: "visible",
        }}
      >
        <path
          style={{
            pointerEvents: "visiblePainted",
            cursor: "pointer",
          }}
          d={pointsToPath(scaledPoints)}
          fill="currentColor"
          className="text-foreground"
        />
      </svg>
    </>
  );
}
