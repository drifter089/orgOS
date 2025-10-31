"use client";

import { useState } from "react";

import { CheckCircle2, Circle, Loader2, Zap } from "lucide-react";

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

export function DirectCacheUpdateDemo() {
  const [metrics, setMetrics] = useState<{
    mutationStart: number;
    mutationEnd: number;
    cacheUpdateTime: number;
  } | null>(null);

  // Read from prefetched cache
  const { data: tasks, isLoading } = api.task.getAll.useQuery();
  const utils = api.useUtils();

  const toggleComplete = api.task.toggleComplete.useMutation({
    onMutate: () => {
      setMetrics({
        mutationStart: Date.now(),
        mutationEnd: 0,
        cacheUpdateTime: 0,
      });
    },
    onSuccess: (updatedTask) => {
      const mutationEnd = Date.now();

      // Direct cache update using mutation response
      utils.task.getAll.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        );
      });

      const cacheUpdateTime = Date.now();

      setMetrics((prev) =>
        prev
          ? {
              ...prev,
              mutationEnd,
              cacheUpdateTime,
            }
          : null,
      );
    },
  });

  const handleToggle = (taskId: string) => {
    toggleComplete.mutate({ id: taskId });
  };

  const filteredTasks = tasks?.slice(0, 3) ?? [];

  return (
    <Card className="border-2 border-green-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="border-green-500 text-green-500">
            Efficient
          </Badge>
          <Zap className="text-muted-foreground h-5 w-5" />
        </div>
        <CardTitle>Direct Cache Update</CardTitle>
        <CardDescription>
          Update cache directly with mutation response. No extra network
          request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        {metrics && metrics.cacheUpdateTime > 0 && (
          <PerformanceMetrics
            metrics={{
              mutationDuration: metrics.mutationEnd - metrics.mutationStart,
              cacheUpdateDuration:
                metrics.cacheUpdateTime - metrics.mutationEnd,
              totalDuration: metrics.cacheUpdateTime - metrics.mutationStart,
              strategy: "direct",
            }}
          />
        )}

        {/* Task List with Toggle */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-sm font-medium">
            Click to toggle completion status
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
              (task: { id: string; title: string; completed: boolean }) => (
                <Button
                  key={task.id}
                  variant="outline"
                  className="flex w-full items-center justify-between"
                  onClick={() => handleToggle(task.id)}
                  disabled={toggleComplete.isPending}
                >
                  <span className="text-sm">{task.title}</span>
                  {toggleComplete.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="text-muted-foreground h-4 w-4" />
                  )}
                </Button>
              ),
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
