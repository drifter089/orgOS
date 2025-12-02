import getStroke from "perfect-freehand";

import type { Points } from "./types";

/**
 * Configuration for perfect-freehand stroke rendering.
 */
export const pathOptions = {
  size: 7,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: {
    taper: 0,
    easing: (t: number) => t,
    cap: true,
  },
  end: {
    taper: 0.1,
    easing: (t: number) => t,
    cap: true,
  },
};

/**
 * Convert a stroke (array of points) to an SVG path string.
 */
export function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]!;
      acc.push(x0!, y0!, ",", (x0! + x1!) / 2, (y0! + y1!) / 2);
      return acc;
    },
    ["M", ...stroke[0]!, "Q"],
  );

  d.push("Z");
  return d.join(" ");
}

/**
 * Convert points (with pressure) to an SVG path string.
 * Optionally scale by zoom level for consistent stroke width.
 */
export function pointsToPath(points: Points, zoom = 1): string {
  const stroke = getStroke(points, {
    ...pathOptions,
    size: pathOptions.size * zoom,
  });
  return getSvgPathFromStroke(stroke);
}
