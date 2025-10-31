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
            <Server className="h-5 w-5 text-orange-600" />
            Live Task Data
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-600 text-white">
              <Database className="mr-1 h-3 w-3" />
              Server Prefetch
            </Badge>
            <Badge className="bg-blue-600 text-white">
              <Monitor className="mr-1 h-3 w-3" />
              Client Display
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info - T3 Stack Pattern */}
        <div className="rounded-md border-2 border-blue-300 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-950/30">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            <RefreshCw className="mr-1 inline h-4 w-4" />
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
