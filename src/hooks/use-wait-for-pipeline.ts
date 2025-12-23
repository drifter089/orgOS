import { useEffect, useRef } from "react";

import { usePipelineQuery } from "./use-pipeline-query";

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

/**
 * Hook for waiting on pipeline completion with callbacks.
 * Detects when pipeline transitions from processing to done.
 */
export function useWaitForPipeline({
  metricId,
  pollInterval = 500,
  onComplete,
  onError,
}: UseWaitForPipelineOptions): UseWaitForPipelineReturn {
  const hasCalledComplete = useRef(false);
  const hasCalledError = useRef(false);
  const previousIsProcessing = useRef<boolean | null>(null);

  const result = usePipelineQuery({ metricId, pollInterval });

  const isComplete =
    previousIsProcessing.current === true &&
    !result.isProcessing &&
    result.hasData;

  // Handle completion/error callbacks
  useEffect(() => {
    if (result.hasData) {
      // Detect transition from processing -> done
      if (previousIsProcessing.current === true && !result.isProcessing) {
        if (result.error && !hasCalledError.current) {
          hasCalledError.current = true;
          onError?.(result.error);
        } else if (!result.error && !hasCalledComplete.current) {
          hasCalledComplete.current = true;
          onComplete?.();
        }
      }
      previousIsProcessing.current = result.isProcessing;
    }
  }, [result.isProcessing, result.error, result.hasData, onComplete, onError]);

  // Reset refs when metricId changes
  useEffect(() => {
    hasCalledComplete.current = false;
    hasCalledError.current = false;
    previousIsProcessing.current = null;
  }, [metricId]);

  // Calculate final progress percent (100% on completion)
  const progressPercent = result.isProcessing
    ? result.progressPercent
    : result.error
      ? 100
      : result.completedSteps.length > 0
        ? 100
        : 0;

  return {
    isProcessing: result.isProcessing,
    isComplete,
    error: result.error,
    currentStepDisplayName: result.currentStepDisplayName,
    progressPercent,
    completedSteps: result.completedSteps,
  };
}
