"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

/**
 * Client Component that reads from TanStack Query cache
 * Automatically updates when mutations modify the cache
 */
export function LiveTaskList() {
  // Reads from the prefetched cache (instant on first render)
  // Automatically re-renders when mutations update the cache
  const { data: tasks, isLoading } = api.task.getAll.useQuery();

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.completed).length ?? 0;
  const pendingTasks = totalTasks - completedTasks;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 rounded-lg border-2 border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20">
          <div className="text-center">
            <div className="text-foreground text-2xl font-bold">...</div>
            <div className="text-muted-foreground text-xs">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">...</div>
            <div className="text-muted-foreground text-xs">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">...</div>
            <div className="text-muted-foreground text-xs">Completed</div>
          </div>
        </div>
        <div className="text-muted-foreground text-center text-sm">
          Loading tasks...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats - Auto-updates when mutations run */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border-2 border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20">
        <div className="text-center">
          <div className="text-foreground text-2xl font-bold">{totalTasks}</div>
          <div className="text-muted-foreground text-xs">Total Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{pendingTasks}</div>
          <div className="text-muted-foreground text-xs">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {completedTasks}
          </div>
          <div className="text-muted-foreground text-xs">Completed</div>
        </div>
      </div>

      {/* Task List - Auto-updates when mutations run */}
      <div className="space-y-2">
        <div className="text-muted-foreground text-sm font-semibold">
          All Tasks ({totalTasks}):
        </div>
        {totalTasks === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            No tasks yet. Create one using the forms below!
          </div>
        ) : (
          <div className="space-y-2">
            {tasks?.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border-2 border-slate-200 bg-slate-50 p-3 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                  )}
                  <span className="text-foreground text-sm font-semibold">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {task.completed && (
                    <Badge
                      variant="outline"
                      className="border-green-600 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                    >
                      Done
                    </Badge>
                  )}
                  <Badge className="bg-purple-600 text-white">
                    P{task.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
