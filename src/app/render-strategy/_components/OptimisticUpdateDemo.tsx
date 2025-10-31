"use client";

import { useState } from "react";

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Rocket,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";

import { PerformanceMetrics } from "./PerformanceMetrics";

export function OptimisticUpdateDemo() {
  const [metrics, setMetrics] = useState<{
    optimisticUpdateTime: number;
    mutationStart: number;
    mutationEnd: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Read from prefetched cache
  const { data: tasks, isLoading } = api.task.getAll.useQuery();
  const utils = api.useUtils();

  const updatePriority = api.task.updatePriority.useMutation({
    onMutate: async ({ id, priority }) => {
      const optimisticUpdateTime = Date.now();
      setErrorMessage(null);

      // Cancel outgoing refetches to prevent optimistic update from being overwritten
      await utils.task.getAll.cancel();

      // Snapshot previous value for rollback
      const previousTasks = utils.task.getAll.getData();

      // Optimistically update cache BEFORE server responds
      utils.task.getAll.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((task) =>
          task.id === id ? { ...task, priority } : task,
        );
      });

      setMetrics({
        optimisticUpdateTime,
        mutationStart: Date.now(),
        mutationEnd: 0,
      });

      // Return context for rollback
      return { previousTasks };
    },
    onError: (err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousTasks) {
        utils.task.getAll.setData(undefined, context.previousTasks);
      }
      setErrorMessage(err.message ?? "Failed to update priority");
    },
    onSuccess: () => {
      setMetrics((prev) =>
        prev
          ? {
              ...prev,
              mutationEnd: Date.now(),
            }
          : null,
      );
    },
    onSettled: () => {
      // Optionally invalidate to ensure accuracy
      void utils.task.invalidate();
    },
  });

  const handlePriorityChange = (
    taskId: string,
    currentPriority: number,
    delta: number,
  ) => {
    const newPriority = Math.max(0, Math.min(10, currentPriority + delta));
    updatePriority.mutate({ id: taskId, priority: newPriority });
  };

  const filteredTasks = tasks?.slice(0, 3) ?? [];

  return (
    <Card className="border-2 border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="border-orange-500 text-orange-500"
          >
            Best UX
          </Badge>
          <Rocket className="text-muted-foreground h-5 w-5" />
        </div>
        <CardTitle>Optimistic Updates</CardTitle>
        <CardDescription>
          Update UI instantly, rollback on error. Best for instant feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Performance Metrics */}
        {metrics && metrics.mutationEnd > 0 && (
          <PerformanceMetrics
            metrics={{
              optimisticUpdateTime: 0, // Instant
              mutationDuration: metrics.mutationEnd - metrics.mutationStart,
              totalDuration: metrics.mutationEnd - metrics.optimisticUpdateTime,
              strategy: "optimistic",
            }}
          />
        )}

        {/* Task List with Priority Controls */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-sm font-medium">
            Adjust task priority (0-10)
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              Create tasks in the Query Invalidation demo first!
            </div>
          ) : (
            filteredTasks.map(
              (task: {
                id: string;
                title: string;
                priority: number;
                completed: boolean;
              }) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="text-muted-foreground text-xs">
                      Priority: {task.priority}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handlePriorityChange(task.id, task.priority, 1)
                      }
                      disabled={updatePriority.isPending || task.priority >= 10}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handlePriorityChange(task.id, task.priority, -1)
                      }
                      disabled={updatePriority.isPending || task.priority <= 0}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
