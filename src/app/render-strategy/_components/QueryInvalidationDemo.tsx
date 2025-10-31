"use client";

import { useState } from "react";

import { CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

import { PerformanceMetrics } from "./PerformanceMetrics";

export function QueryInvalidationDemo() {
  const [title, setTitle] = useState("");
  const [metrics, setMetrics] = useState<{
    mutationStart: number;
    mutationEnd: number;
    refetchStart: number;
    refetchEnd: number;
  } | null>(null);

  // Read from prefetched cache (instant on first render)
  const { data: tasks, isLoading } = api.task.getAll.useQuery();
  const utils = api.useUtils();

  const createTask = api.task.create.useMutation({
    onMutate: () => {
      // Track mutation start time
      setMetrics({
        mutationStart: Date.now(),
        mutationEnd: 0,
        refetchStart: 0,
        refetchEnd: 0,
      });
    },
    onSuccess: async () => {
      const mutationEnd = Date.now();

      // Mark queries as stale and trigger refetch
      const refetchStart = Date.now();
      await utils.task.invalidate();
      const refetchEnd = Date.now();

      setMetrics((prev) =>
        prev
          ? {
              ...prev,
              mutationEnd,
              refetchStart,
              refetchEnd,
            }
          : null,
      );

      setTitle("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createTask.mutate({ title: title.trim() });
    }
  };

  const filteredTasks = tasks?.slice(0, 3) ?? [];

  return (
    <Card className="border-2 border-blue-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            Recommended
          </Badge>
          <Clock className="text-muted-foreground h-5 w-5" />
        </div>
        <CardTitle>Query Invalidation</CardTitle>
        <CardDescription>
          Refetch from server after mutation. Safest pattern for data
          consistency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        {metrics && metrics.refetchEnd > 0 && (
          <PerformanceMetrics
            metrics={{
              mutationDuration: metrics.mutationEnd - metrics.mutationStart,
              refetchDuration: metrics.refetchEnd - metrics.refetchStart,
              totalDuration: metrics.refetchEnd - metrics.mutationStart,
              strategy: "invalidation",
            }}
          />
        )}

        {/* Create Task Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            type="text"
            placeholder="New task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={createTask.isPending}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={createTask.isPending || !title.trim()}
          >
            {createTask.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating & Refetching...
              </>
            ) : (
              "Create Task"
            )}
          </Button>
        </form>

        {/* Task List */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-sm font-medium">
            Recent Tasks (showing {filteredTasks.length})
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              No tasks yet. Create one above!
            </div>
          ) : (
            filteredTasks.map(
              (task: { id: string; title: string; completed: boolean }) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm">{task.title}</span>
                  {task.completed && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ),
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
