"use client";

import { motion } from "framer-motion";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
}: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-start gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <motion.div
            key={stepNumber}
            className="relative"
            initial={false}
            animate={{
              scale: isActive ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                isActive
                  ? "bg-foreground"
                  : isCompleted
                    ? "bg-foreground/40"
                    : "bg-border"
              }`}
            />
            {isActive && (
              <motion.div
                className="border-foreground/30 absolute inset-0 rounded-full border"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.8, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
