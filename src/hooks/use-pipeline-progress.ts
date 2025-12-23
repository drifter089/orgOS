import { type CompletedStep, usePipelineQuery } from "./use-pipeline-query";

interface UsePipelineProgressOptions {
  metricId: string;
  enabled?: boolean;
  pollInterval?: number;
}

export type { CompletedStep };

export interface PipelineProgressState {
  isProcessing: boolean;
  currentStep: string | null;
  currentStepDisplayName: string | null;
  completedSteps: CompletedStep[];
  totalSteps: number;
  progressPercent: number;
  error: string | null;
}

/**
 * Hook for monitoring pipeline progress.
 * Returns current step, completed steps, and progress percentage.
 */
export function usePipelineProgress({
  metricId,
  enabled = true,
  pollInterval = 500,
}: UsePipelineProgressOptions): PipelineProgressState {
  const result = usePipelineQuery({ metricId, enabled, pollInterval });

  return {
    isProcessing: result.isProcessing,
    currentStep: result.currentStep,
    currentStepDisplayName: result.currentStepDisplayName,
    completedSteps: result.completedSteps,
    totalSteps: result.totalSteps,
    progressPercent: result.progressPercent,
    error: result.error,
  };
}
