"use client";

import { Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface PerformanceMetricsProps {
  metrics: {
    mutationDuration?: number;
    refetchDuration?: number;
    cacheUpdateDuration?: number;
    optimisticUpdateTime?: number;
    totalDuration: number;
    strategy: "invalidation" | "direct" | "optimistic";
  };
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const {
    mutationDuration = 0,
    refetchDuration = 0,
    cacheUpdateDuration = 0,
    totalDuration,
    strategy,
  } = metrics;

  return (
    <div className="bg-card space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">Performance Metrics</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {totalDuration}ms total
        </Badge>
      </div>

      {/* Timeline Visualization */}
      <div className="space-y-1">
        {strategy === "invalidation" && (
          <>
            <TimelineBar
              label="Mutation"
              duration={mutationDuration}
              color="bg-blue-500"
              maxDuration={totalDuration}
            />
            <TimelineBar
              label="Refetch"
              duration={refetchDuration}
              color="bg-blue-400"
              maxDuration={totalDuration}
            />
          </>
        )}

        {strategy === "direct" && (
          <>
            <TimelineBar
              label="Mutation"
              duration={mutationDuration}
              color="bg-green-500"
              maxDuration={totalDuration}
            />
            <TimelineBar
              label="Cache Update"
              duration={cacheUpdateDuration}
              color="bg-green-400"
              maxDuration={totalDuration}
              instant
            />
          </>
        )}

        {strategy === "optimistic" && (
          <>
            <TimelineBar
              label="UI Update (instant)"
              duration={0}
              color="bg-orange-400"
              maxDuration={totalDuration}
              instant
            />
            <TimelineBar
              label="Server Confirmation"
              duration={mutationDuration}
              color="bg-orange-500"
              maxDuration={totalDuration}
            />
          </>
        )}
      </div>

      {/* Strategy-specific insights */}
      <div className="text-muted-foreground text-xs">
        {strategy === "invalidation" && (
          <p>
            <strong className="text-foreground">Network delay:</strong> Two
            round trips (mutation + refetch)
          </p>
        )}
        {strategy === "direct" && (
          <p>
            <strong className="text-foreground">Efficient:</strong> One round
            trip, instant cache update
          </p>
        )}
        {strategy === "optimistic" && (
          <p>
            <strong className="text-foreground">Instant UX:</strong> UI updates
            before server responds
          </p>
        )}
      </div>
    </div>
  );
}

function TimelineBar({
  label,
  duration,
  color,
  maxDuration,
  instant = false,
}: {
  label: string;
  duration: number;
  color: string;
  maxDuration: number;
  instant?: boolean;
}) {
  const width = instant ? 5 : Math.max(10, (duration / maxDuration) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground w-24 text-xs">{label}</div>
      <div className="flex-1">
        <div className="bg-muted relative h-4 overflow-hidden rounded-sm">
          <div
            className={`h-full ${color} transition-all duration-500`}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <div className="text-muted-foreground w-12 text-right font-mono text-xs">
        {instant ? "~0ms" : `${duration}ms`}
      </div>
    </div>
  );
}
