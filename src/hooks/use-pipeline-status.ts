import { useEffect, useRef } from "react";

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

export interface PipelineStatus {
  /** Whether the pipeline is currently processing */
  isProcessing: boolean;
  /** True on the render cycle when pipeline just completed (processing -> done) */
  isComplete: boolean;
  /** Error message if pipeline failed */
  error: string | null;
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
}

interface UsePipelineStatusOptions {
  /** Metric ID to track pipeline for */
  metricId: string | null;
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
  /** Polling interval in ms (default: 500) */
  pollInterval?: number;
  /** Callback fired once when pipeline completes successfully */
  onComplete?: () => void;
  /** Callback fired once when pipeline fails */
  onError?: (error: string) => void;
}

/**
 * Unified hook for pipeline status tracking.
 *
 * Provides:
 * - Real-time pipeline progress via polling
 * - Completion/error detection with callbacks
 * - Progress calculation with step info
 *
 * Single source of truth for all pipeline UI needs.
 */
export function usePipelineStatus({
  metricId,
  enabled = true,
  pollInterval = 500,
  onComplete,
  onError,
}: UsePipelineStatusOptions): PipelineStatus {
  // Refs for transition detection and callback guards
  const prevIsProcessingRef = useRef<boolean | null>(null);
  const hasCalledCompleteRef = useRef(false);
  const hasCalledErrorRef = useRef(false);

  const shouldQuery = enabled && !!metricId;

  const { data } = api.pipeline.getProgress.useQuery(
    { metricId: metricId! },
    {
      enabled: shouldQuery,
      refetchInterval: shouldQuery ? pollInterval : false,
    },
  );

  const isProcessing = data?.isProcessing ?? false;
  const error = data?.error ?? null;
  const hasData = data !== undefined;

  // Detect completion transition (processing -> done)
  const isComplete =
    prevIsProcessingRef.current === true && !isProcessing && hasData;

  // Handle completion/error callbacks
  useEffect(() => {
    if (!hasData) return;

    // Detect transition from processing -> done
    if (prevIsProcessingRef.current === true && !isProcessing) {
      if (error && !hasCalledErrorRef.current) {
        hasCalledErrorRef.current = true;
        onError?.(error);
      } else if (!error && !hasCalledCompleteRef.current) {
        hasCalledCompleteRef.current = true;
        onComplete?.();
      }
    }

    prevIsProcessingRef.current = isProcessing;
  }, [isProcessing, error, hasData, onComplete, onError]);

  // Reset refs when metricId changes
  useEffect(() => {
    hasCalledCompleteRef.current = false;
    hasCalledErrorRef.current = false;
    prevIsProcessingRef.current = null;
  }, [metricId]);

  // Not processing or no data yet
  if (!isProcessing || !data) {
    return {
      isProcessing: false,
      isComplete,
      currentStep: null,
      currentStepDisplayName: null,
      completedSteps: [],
      totalSteps: 0,
      progressPercent: data?.completedSteps?.length ? 100 : 0,
      error,
    };
  }

  // Processing - compute progress info (data is guaranteed to exist here)
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
    isComplete: false,
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
