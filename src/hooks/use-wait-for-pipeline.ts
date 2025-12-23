import { useEffect, useRef } from "react";

import { PIPELINE_CONFIGS } from "@/lib/pipeline/configs";
import { api } from "@/trpc/react";

interface UseWaitForPipelineOptions {
  metricId: string | null;
  pollInterval?: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface UseWaitForPipelineReturn {
  isProcessing: boolean;
  isComplete: boolean;
  error: string | null;
  currentStepDisplayName: string | null;
  progressPercent: number;
  completedSteps: Array<{
    step: string;
    displayName: string;
    status: "completed" | "failed";
    durationMs?: number;
  }>;
}

const STEP_DISPLAY_NAMES: Record<string, string> = {
  "fetching-api-data": "Fetching data...",
  "deleting-old-data": "Clearing old data...",
  "deleting-old-transformer": "Removing old transformer...",
  "generating-ingestion-transformer": "Generating transformer...",
  "executing-ingestion-transformer": "Processing data...",
  "saving-timeseries-data": "Saving data...",
  "generating-chart-transformer": "Generating chart...",
  "executing-chart-transformer": "Creating visualization...",
  "saving-chart-config": "Finalizing...",
};

// Step counts from pipeline configs (single source of truth)
const CREATE_STEPS = PIPELINE_CONFIGS.create.length;
const SOFT_REFRESH_STEPS = PIPELINE_CONFIGS["soft-refresh"].length;
const HARD_REFRESH_STEPS = PIPELINE_CONFIGS["hard-refresh"].length;

export function useWaitForPipeline({
  metricId,
  pollInterval = 500,
  onComplete,
  onError,
}: UseWaitForPipelineOptions): UseWaitForPipelineReturn {
  const hasCalledComplete = useRef(false);
  const hasCalledError = useRef(false);
  const previousIsProcessing = useRef<boolean | null>(null);

  const { data } = api.pipeline.getProgress.useQuery(
    { metricId: metricId! },
    {
      enabled: !!metricId,
      refetchInterval: metricId ? pollInterval : false,
    },
  );

  const isProcessing = data?.isProcessing ?? false;
  const error = data?.error ?? null;
  const currentStep = data?.currentStep ?? null;
  const completedSteps = data?.completedSteps ?? [];

  // Detect pipeline type: hard-refresh has delete steps, create has generate, soft-refresh has neither
  const allSteps = [...completedSteps.map((s) => s.step), currentStep].filter(
    Boolean,
  );
  const hasDeleteStep =
    allSteps.includes("deleting-old-data") ||
    allSteps.includes("deleting-old-transformer");
  const hasGenerateStep = allSteps.includes("generating-ingestion-transformer");
  const totalSteps = hasDeleteStep
    ? HARD_REFRESH_STEPS
    : hasGenerateStep
      ? CREATE_STEPS
      : SOFT_REFRESH_STEPS;

  const progressPercent = isProcessing
    ? Math.min(Math.round((completedSteps.length / totalSteps) * 100), 95)
    : error
      ? 100
      : completedSteps.length > 0
        ? 100
        : 0;

  const isComplete =
    previousIsProcessing.current === true &&
    !isProcessing &&
    data !== undefined;

  useEffect(() => {
    if (data !== undefined) {
      if (previousIsProcessing.current === true && !isProcessing) {
        if (error && !hasCalledError.current) {
          hasCalledError.current = true;
          onError?.(error);
        } else if (!error && !hasCalledComplete.current) {
          hasCalledComplete.current = true;
          onComplete?.();
        }
      }
      previousIsProcessing.current = isProcessing;
    }
  }, [isProcessing, error, data, onComplete, onError]);

  useEffect(() => {
    hasCalledComplete.current = false;
    hasCalledError.current = false;
    previousIsProcessing.current = null;
  }, [metricId]);

  return {
    isProcessing,
    isComplete,
    error,
    currentStepDisplayName: currentStep
      ? (STEP_DISPLAY_NAMES[currentStep] ?? currentStep)
      : null,
    progressPercent,
    completedSteps: completedSteps.map((step) => ({
      ...step,
      displayName:
        STEP_DISPLAY_NAMES[step.step] ?? step.displayName ?? step.step,
    })),
  };
}
