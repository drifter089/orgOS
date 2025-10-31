import { Database, Monitor, RefreshCw, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { LiveTaskList } from "./LiveTaskList";

/**
 * Server Component wrapper that provides context and structure
 * The actual data display is handled by LiveTaskList (Client Component)
 * which reads from the prefetched TanStack Query cache
 */
export function ServerTaskList() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="text-primary h-5 w-5" />
            Live Task Data
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <Database className="h-3 w-3" />
              Server Prefetch
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Monitor className="h-3 w-3" />
              Client Display
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info - T3 Stack Pattern */}
        <div className="border-primary/30 bg-primary/5 rounded-lg border-2 p-3">
          <p className="text-foreground text-sm font-semibold">
            <RefreshCw className="text-primary mr-1 inline h-4 w-4" />
            <strong>T3 Stack Pattern:</strong> Server prefetches data (instant
            load) → Client Component reads cache → Auto-updates on mutations
            below ⬇
          </p>
        </div>

        {/* Client Component - Auto-updates when mutations run */}
        <LiveTaskList />
      </CardContent>
    </Card>
  );
}
