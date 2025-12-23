import { PIPELINE_CONFIGS } from "@/lib/pipeline/configs";
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

// Map step names to display names (frontend version)
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
const SOFT_REFRESH_STEPS = PIPELINE_CONFIGS["soft-refresh"].length;
const HARD_REFRESH_STEPS = PIPELINE_CONFIGS["hard-refresh"].length;
const CREATE_STEPS = PIPELINE_CONFIGS.create.length;

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
  const completedCount = completedSteps.length;
  const progressPercent = Math.min(
    Math.round((completedCount / totalSteps) * 100),
    95, // Cap at 95% until done
  );

  return {
    isProcessing: true,
    currentStep,
    currentStepDisplayName: currentStep
      ? (STEP_DISPLAY_NAMES[currentStep] ?? currentStep)
      : null,
    completedSteps: completedSteps.map((step) => ({
      ...step,
      displayName:
        STEP_DISPLAY_NAMES[step.step] ?? step.displayName ?? step.step,
    })),
    totalSteps,
    progressPercent,
    error: null,
  };
}
