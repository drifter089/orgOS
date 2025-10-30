"use client";

import { useState } from "react";

import { Code } from "lucide-react";

import { CodeBlock } from "@/app/docs/_components/CodeBlock";
import { Button } from "@/components/ui/button";

interface StrategyCodeExampleProps {
  strategy: "invalidation" | "direct" | "optimistic";
}

export function StrategyCodeExample({ strategy }: StrategyCodeExampleProps) {
  const [showCode, setShowCode] = useState(false);

  const getCodeExample = () => {
    switch (strategy) {
      case "invalidation":
        return `const createTask = api.task.create.useMutation({
  onSuccess: async () => {
    // Mark queries as stale and trigger refetch
    await utils.task.invalidate();

    // UI updates after refetch completes
    // ✅ Guarantees data consistency
    // ❌ Slower UX (waits for network)
  },
});`;

      case "direct":
        return `const toggleComplete = api.task.toggleComplete.useMutation({
  onSuccess: (updatedTask) => {
    // Update cache directly with mutation response
    utils.task.getAll.setData(undefined, (oldData) => {
      return oldData?.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      );
    });

    // ✅ No extra network request
    // ✅ Faster than invalidation
    // ❌ Requires complete data in response
  },
});`;

      case "optimistic":
        return `const updatePriority = api.task.updatePriority.useMutation({
  onMutate: async ({ id, priority }) => {
    // Cancel outgoing refetches
    await utils.task.getAll.cancel();

    // Snapshot previous value for rollback
    const previousTasks = utils.task.getAll.getData();

    // Optimistically update cache BEFORE server responds
    utils.task.getAll.setData(undefined, (oldData) => {
      return oldData?.map((task) =>
        task.id === id ? { ...task, priority } : task
      );
    });

    return { previousTasks };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    utils.task.getAll.setData(undefined, context?.previousTasks);
  },

  // ✅ Instant UI feedback
  // ✅ Best perceived performance
  // ❌ More complex implementation
});`;
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => setShowCode(!showCode)}
      >
        <Code className="h-4 w-4" />
        {showCode ? "Hide" : "Show"} Code Example
      </Button>

      {showCode && (
        <div className="overflow-hidden rounded-lg">
          <CodeBlock className="language-typescript">
            {getCodeExample()}
          </CodeBlock>
        </div>
      )}
    </div>
  );
}
