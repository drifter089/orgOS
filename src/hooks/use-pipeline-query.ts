import {
  detectPipelineType,
  getPipelineStepCount,
  getStepShortName,
} from "@/lib/pipeline";
import { api } from "@/trpc/react";

export interface CompletedStep {
  step: string;
  displayName: string;
  status: "completed" | "failed";
  durationMs?: number;
}

export interface PipelineQueryResult {
  /** Whether the pipeline is currently processing */
  isProcessing: boolean;
  /** Current step name (raw) */
  currentStep: string | null;
  /** Current step display name (formatted) */
  currentStepDisplayName: string | null;
  /** List of completed steps with display names */
  completedSteps: CompletedStep[];
  /** Total number of steps for detected pipeline type */
  totalSteps: number;
  /** Progress percentage (0-100, capped at 95 while processing) */
  progressPercent: number;
  /** Error message if pipeline failed */
  error: string | null;
  /** Whether query has loaded initial data */
  hasData: boolean;
}

interface UsePipelineQueryOptions {
  metricId: string | null;
  enabled?: boolean;
  pollInterval?: number;
}

/**
 * Shared hook for pipeline progress querying and calculation.
 * Used by both usePipelineProgress and useWaitForPipeline.
 */
export function usePipelineQuery({
  metricId,
  enabled = true,
  pollInterval = 500,
}: UsePipelineQueryOptions): PipelineQueryResult {
  const shouldQuery = enabled && !!metricId;

  const { data } = api.pipeline.getProgress.useQuery(
    { metricId: metricId! },
    {
      enabled: shouldQuery,
      refetchInterval: shouldQuery ? pollInterval : false,
    },
  );

  // Not processing or no data yet
  if (!data?.isProcessing) {
    return {
      isProcessing: false,
      currentStep: null,
      currentStepDisplayName: null,
      completedSteps: [],
      totalSteps: 0,
      progressPercent: data?.completedSteps?.length ? 100 : 0,
      error: data?.error ?? null,
      hasData: data !== undefined,
    };
  }

  const completedSteps = data.completedSteps ?? [];
  const currentStep = data.currentStep;

  // Detect pipeline type from all known steps
  const allSteps = [...completedSteps.map((s) => s.step), currentStep].filter(
    Boolean,
  ) as string[];
  const pipelineType = detectPipelineType(allSteps);
  const totalSteps = getPipelineStepCount(pipelineType);

  // Calculate progress (cap at 95% until complete)
  const completedCount = completedSteps.length;
  const progressPercent = Math.min(
    Math.round((completedCount / totalSteps) * 100),
    95,
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
    hasData: true,
  };
}
