"use client";

import { ArrowDown, Monitor, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function NestedComponentDiagram() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h3 className="mb-2 text-lg font-semibold">
              This Page Architecture
            </h3>
            <p className="text-muted-foreground text-sm">
              Server Components prefetch data → Client Components read from
              hydrated cache
            </p>
          </div>

          {/* Component Tree */}
          <div className="space-y-4">
            {/* Server: Page Component */}
            <div className="space-y-2">
              <ComponentBox
                type="server"
                name="page.tsx"
                description="Server Component - Prefetches task data"
              >
                <div className="mt-2 rounded-md border border-dashed border-orange-200 bg-orange-50/50 p-2 font-mono text-xs dark:border-orange-800 dark:bg-orange-950/20">
                  await api.task.getAll.prefetch()
                </div>
              </ComponentBox>

              <div className="flex justify-center">
                <ArrowDown className="text-muted-foreground h-5 w-5" />
              </div>

              {/* Client: HydrateClient Wrapper */}
              <ComponentBox
                type="server"
                name="HydrateClient"
                description="Transfers cache from server to client"
              >
                <div className="mt-2 space-y-3 pl-4">
                  <div className="flex justify-center">
                    <ArrowDown className="text-muted-foreground h-4 w-4" />
                  </div>

                  {/* Client: Demo Components */}
                  <div className="space-y-2">
                    <ComponentBox
                      type="client"
                      name="QueryInvalidationDemo"
                      description="Client Component - Reads cached data, handles mutations"
                      compact
                    />
                    <ComponentBox
                      type="client"
                      name="DirectCacheUpdateDemo"
                      description="Client Component - Direct cache manipulation"
                      compact
                    />
                    <ComponentBox
                      type="client"
                      name="OptimisticUpdateDemo"
                      description="Client Component - Optimistic updates with rollback"
                      compact
                    />
                  </div>
                </div>
              </ComponentBox>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-muted/50 flex items-center gap-4 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground text-xs">
                Server Component
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground text-xs">
                Client Component
              </span>
            </div>
          </div>

          {/* Data Flow */}
          <div className="bg-muted/50 space-y-2 rounded-lg border p-4 text-xs">
            <div className="text-foreground font-semibold">Data Flow:</div>
            <ol className="text-muted-foreground ml-4 list-decimal space-y-1">
              <li>Server prefetches data (~5ms, direct function call)</li>
              <li>TanStack Query dehydrates cache state</li>
              <li>HTML + cache state sent to browser</li>
              <li>HydrateClient restores cache on client</li>
              <li>Client components read from cache (instant!)</li>
              <li>Background refetch ensures freshness</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentBox({
  type,
  name,
  description,
  children,
  compact = false,
}: {
  type: "server" | "client";
  name: string;
  description: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const bgColor =
    type === "server"
      ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
      : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800";

  const iconColor = type === "server" ? "text-orange-500" : "text-blue-500";
  const Icon = type === "server" ? Server : Monitor;

  return (
    <div
      className={`rounded-lg border-2 ${bgColor} ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <span
              className={`font-mono ${compact ? "text-xs" : "text-sm"} font-semibold`}
            >
              {name}
            </span>
          </div>
          <div
            className={`mt-1 ${compact ? "text-xs" : "text-sm"} text-muted-foreground`}
          >
            {description}
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            type === "server"
              ? "border-orange-500 text-orange-500"
              : "border-blue-500 text-blue-500"
          }
        >
          {type === "server" ? "Server" : "Client"}
        </Badge>
      </div>
      {children}
    </div>
  );
}
