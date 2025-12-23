"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { usePipelineProgress } from "@/hooks/use-pipeline-progress";
import { cn } from "@/lib/utils";

interface PipelineProgressProps {
  metricId: string;
  isActive: boolean;
  variant?: "minimal" | "compact" | "detailed";
}

export function PipelineProgress({
  metricId,
  isActive,
  variant = "compact",
}: PipelineProgressProps) {
  const progress = usePipelineProgress({
    metricId,
    enabled: isActive,
  });

  if (!progress.isProcessing) {
    return null;
  }

  // Minimal: just a spinner with current step
  if (variant === "minimal") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{progress.currentStepDisplayName ?? "Processing..."}</span>
      </div>
    );
  }

  // Compact: progress bar with current step
  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {progress.currentStepDisplayName ?? "Processing..."}
          </span>
          <span className="text-muted-foreground">
            {progress.progressPercent}%
          </span>
        </div>
        <Progress value={progress.progressPercent} className="h-1.5" />
      </div>
    );
  }

  // Detailed: show all steps with checkmarks
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {progress.currentStepDisplayName ?? "Processing..."}
        </span>
        <span className="text-muted-foreground">
          {progress.progressPercent}%
        </span>
      </div>

      <Progress value={progress.progressPercent} className="h-2" />

      <div className="space-y-1 text-sm">
        {progress.completedSteps.map((step) => (
          <div
            key={step.step}
            className={cn(
              "flex items-center gap-2",
              step.status === "completed" && "text-green-600",
              step.status === "failed" && "text-destructive",
            )}
          >
            {step.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{step.displayName}</span>
            {step.durationMs && (
              <span className="text-muted-foreground text-xs">
                ({(step.durationMs / 1000).toFixed(1)}s)
              </span>
            )}
          </div>
        ))}

        {progress.currentStep && (
          <div className="text-primary flex items-center gap-2 font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{progress.currentStepDisplayName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
