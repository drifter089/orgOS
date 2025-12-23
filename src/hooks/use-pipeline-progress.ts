import {
  detectPipelineType,
  getPipelineStepCount,
  getStepShortName,
} from "@/lib/pipeline";
import { api } from "@/trpc/react";

interface UsePipelineProgressOptions {
  metricId: string;
  enabled?: boolean;
  pollInterval?: number;
}

export interface CompletedStep {
  step: string;
  displayName: string;
  status: "completed" | "failed";
  durationMs?: number;
}

export interface PipelineProgressState {
  isProcessing: boolean;
  currentStep: string | null;
  currentStepDisplayName: string | null;
  completedSteps: CompletedStep[];
  totalSteps: number;
  progressPercent: number;
  error: string | null;
}

export function usePipelineProgress({
  metricId,
  enabled = true,
  pollInterval = 500,
}: UsePipelineProgressOptions): PipelineProgressState {
  const { data } = api.pipeline.getProgress.useQuery(
    { metricId },
    {
      enabled,
      refetchInterval: enabled ? pollInterval : false,
    },
  );

  if (!data?.isProcessing) {
    return {
      isProcessing: false,
      currentStep: null,
      currentStepDisplayName: null,
      completedSteps: [],
      totalSteps: 0,
      progressPercent: 0,
      error: data?.error ?? null,
    };
  }

  const completedSteps = data.completedSteps ?? [];
  const currentStep = data.currentStep;

  // Detect pipeline type from completed steps
  const allSteps = [...completedSteps.map((s) => s.step), currentStep].filter(
    Boolean,
  ) as string[];
  const pipelineType = detectPipelineType(allSteps);
  const totalSteps = getPipelineStepCount(pipelineType);

  const completedCount = completedSteps.length;
  const progressPercent = Math.min(
    Math.round((completedCount / totalSteps) * 100),
    95, // Cap at 95% until done
  );

  return {
    isProcessing: true,
    currentStep,
    currentStepDisplayName: currentStep ? getStepShortName(currentStep) : null,
    completedSteps: completedSteps.map((step) => ({
      ...step,
      displayName: getStepShortName(step.step),
    })),
    totalSteps,
    progressPercent,
    error: null,
  };
}
