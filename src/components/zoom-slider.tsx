"use client";

import React from "react";

import {
  Panel,
  type PanelProps,
  useReactFlow,
  useStore,
  useViewport,
} from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type ZoomSliderProps = Omit<PanelProps, "children">;

export function ZoomSlider({ className, ...props }: ZoomSliderProps) {
  const { zoom } = useViewport();
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow();
  const minZoom = useStore((state) => state.minZoom);
  const maxZoom = useStore((state) => state.maxZoom);

  return (
    <Panel
      className={cn(
        "supports-backdrop-filter:bg-background/60 bg-background/95",
        "ring-border/50 flex gap-1 rounded-md border p-1.5 shadow-md ring-1 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomOut({ duration: 300 })}
        className="h-8 w-8"
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Slider
        className="w-[140px]"
        value={[zoom]}
        min={minZoom}
        max={maxZoom}
        step={0.01}
        onValueChange={(values) => {
          const value = values[0];
          if (value !== undefined) {
            void zoomTo(value);
          }
        }}
        aria-label="Zoom level"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomIn({ duration: 300 })}
        className="h-8 w-8"
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        className="min-w-20 tabular-nums"
        variant="ghost"
        onClick={() => zoomTo(1, { duration: 300 })}
        aria-label="Reset zoom to 100%"
      >
        {(100 * zoom).toFixed(0)}%
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fitView({ duration: 300 })}
        className="h-8 w-8"
        aria-label="Fit view to content"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </Panel>
  );
}
