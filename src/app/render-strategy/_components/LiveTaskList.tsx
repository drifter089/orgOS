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
        <div className="border-muted bg-muted/50 grid grid-cols-3 gap-4 rounded-lg border-2 p-4">
          <div className="text-center">
            <div className="text-foreground text-2xl font-bold">...</div>
            <div className="text-muted-foreground text-xs">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-foreground text-2xl font-bold">...</div>
            <div className="text-muted-foreground text-xs">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-foreground text-2xl font-bold">...</div>
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
      <div className="border-muted bg-muted/50 grid grid-cols-3 gap-4 rounded-lg border-2 p-4">
        <div className="text-center">
          <div className="text-foreground text-2xl font-bold">{totalTasks}</div>
          <div className="text-muted-foreground text-xs">Total Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-foreground text-2xl font-bold">
            {pendingTasks}
          </div>
          <div className="text-muted-foreground text-xs">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-foreground text-2xl font-bold">
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
          <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            No tasks yet. Create one using the forms below!
          </div>
        ) : (
          <div className="space-y-2">
            {tasks?.map((task) => (
              <div
                key={task.id}
                className="border-border bg-card flex items-center justify-between rounded-lg border-2 p-3 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  {task.completed ? (
                    <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
                  ) : (
                    <Circle className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                  )}
                  <span className="text-foreground text-sm font-semibold">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {task.completed && (
                    <Badge
                      variant="outline"
                      className="border-primary/50 bg-primary/10 text-primary"
                    >
                      Done
                    </Badge>
                  )}
                  <Badge variant="secondary">P{task.priority}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
