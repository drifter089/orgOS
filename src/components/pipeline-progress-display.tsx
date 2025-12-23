"use client";

import { useEffect, useRef } from "react";

import {
  AnimatePresence,
  motion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  type CompletedStep,
  usePipelineProgress,
} from "@/hooks/use-pipeline-progress";
import { cn } from "@/lib/utils";

interface PipelineProgressDisplayProps {
  metricId: string;
  isActive: boolean;
  /** Height variant: card=220px (chart area), drawer=400px */
  variant?: "card" | "drawer";
  /** Callback when pipeline completes successfully */
  onComplete?: () => void;
  /** Callback when pipeline fails */
  onError?: (error: string) => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

// Completed step with animated checkmark
function CompletedStepItem({ step }: { step: CompletedStep }) {
  return (
    <motion.div
      variants={stepVariants}
      className="flex items-center gap-2.5 text-sm"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 25,
          delay: 0.05,
        }}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/15"
      >
        <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
      </motion.div>
      <span className="text-foreground/80">{step.displayName}</span>
      {step.durationMs && (
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {(step.durationMs / 1000).toFixed(1)}s
        </span>
      )}
    </motion.div>
  );
}

// Current step with pulsing indicator
function CurrentStepItem({ displayName }: { displayName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center gap-2.5 text-sm"
    >
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        {/* Pulsing ring */}
        <motion.div
          className="bg-primary/30 absolute h-5 w-5 rounded-full"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Solid dot */}
        <div className="bg-primary h-2.5 w-2.5 rounded-full" />
      </div>
      <span className="text-primary font-medium">{displayName}</span>
      <Loader2 className="text-primary/60 ml-auto h-3.5 w-3.5 animate-spin" />
    </motion.div>
  );
}

// Animated progress bar with shimmer
function AnimatedProgressBar({ percent }: { percent: number }) {
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 20,
  });

  useEffect(() => {
    springValue.set(percent);
  }, [percent, springValue]);

  const width = useTransform(springValue, (v) => `${v}%`);

  return (
    <div className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full">
      {/* Progress fill */}
      <motion.div
        className="bg-primary absolute inset-y-0 left-0 rounded-full"
        style={{ width }}
      />
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        animate={{ x: ["-100%", "400%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

export function PipelineProgressDisplay({
  metricId,
  isActive,
  variant = "card",
  onComplete,
  onError,
}: PipelineProgressDisplayProps) {
  const progress = usePipelineProgress({
    metricId,
    enabled: isActive,
  });

  const prevIsProcessingRef = useRef<boolean | null>(null);
  const errorShownRef = useRef<string | null>(null);

  // Calculate step display
  const currentStepIndex = progress.completedSteps.length;
  const stepDisplay = `Step ${currentStepIndex + 1} of ${progress.totalSteps}`;

  // Detect completion transition
  useEffect(() => {
    if (
      prevIsProcessingRef.current === true &&
      !progress.isProcessing &&
      !progress.error
    ) {
      onComplete?.();
    }
    prevIsProcessingRef.current = progress.isProcessing;
  }, [progress.isProcessing, progress.error, onComplete]);

  // Handle errors via toast (only show once per error)
  useEffect(() => {
    if (progress.error && progress.error !== errorShownRef.current) {
      errorShownRef.current = progress.error;
      toast.error("Pipeline failed", {
        description: progress.error,
        duration: 10000,
      });
      onError?.(progress.error);
    }
    if (!progress.isProcessing) {
      errorShownRef.current = null;
    }
  }, [progress.error, progress.isProcessing, onError]);

  // Don't render if not processing
  if (!progress.isProcessing) {
    return null;
  }

  const heightClass = variant === "drawer" ? "h-[400px]" : "h-[220px]";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="pipeline-progress-display"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          "flex flex-col rounded-lg border border-dashed p-6",
          heightClass,
        )}
      >
        {/* Header: Step count and percentage */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium">
            {stepDisplay}
          </span>
          <span className="text-muted-foreground text-sm tabular-nums">
            {progress.progressPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <AnimatedProgressBar percent={progress.progressPercent} />

        {/* Steps list */}
        <motion.div
          className="mt-6 flex flex-1 flex-col gap-2.5 overflow-y-auto"
          variants={containerVariants}
        >
          {/* Completed steps */}
          {progress.completedSteps.map((step) => (
            <CompletedStepItem key={step.step} step={step} />
          ))}

          {/* Current step */}
          {progress.currentStepDisplayName && (
            <CurrentStepItem displayName={progress.currentStepDisplayName} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
