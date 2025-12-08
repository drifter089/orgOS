"use client";

import Link from "next/link";

import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

interface FinishStepProps {
  onBack: () => void;
}

export function FinishStep({ onBack }: FinishStepProps) {
  // Mock team ID - will be replaced with actual ID when hooked up
  const mockTeamId = "demo-team";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Success icon */}
      <motion.div
        className="bg-foreground/5 border-border mb-8 flex h-12 w-12 items-center justify-center rounded-full border"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Check className="text-foreground h-5 w-5" />
      </motion.div>

      <h1
        className="text-foreground font-sans text-3xl sm:text-4xl"
        style={{ letterSpacing: "-0.03em", lineHeight: "1.1" }}
      >
        you&apos;re all set
      </h1>
      <p
        className="text-muted-foreground mt-4 max-w-sm"
        style={{ letterSpacing: "-0.02em" }}
      >
        your organization is ready. let&apos;s build your first role canvas.
      </p>

      {/* Summary of what was created */}
      <motion.div
        className="mt-10 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="border-border/50 flex items-center gap-3 border-b py-3">
          <div className="bg-foreground/40 h-1.5 w-1.5 rounded-full" />
          <span
            className="text-muted-foreground font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            ORGANIZATION
          </span>
          <span
            className="text-foreground ml-auto font-sans text-sm"
            style={{ letterSpacing: "-0.02em" }}
          >
            created
          </span>
        </div>
        <div className="border-border/50 flex items-center gap-3 border-b py-3">
          <div className="bg-foreground/40 h-1.5 w-1.5 rounded-full" />
          <span
            className="text-muted-foreground font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            TEAM
          </span>
          <span
            className="text-foreground ml-auto font-sans text-sm"
            style={{ letterSpacing: "-0.02em" }}
          >
            created
          </span>
        </div>
        <div className="border-border/50 flex items-center gap-3 border-b py-3">
          <div className="bg-foreground/40 h-1.5 w-1.5 rounded-full" />
          <span
            className="text-muted-foreground font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            FIRST ROLE
          </span>
          <span
            className="text-foreground ml-auto font-sans text-sm"
            style={{ letterSpacing: "-0.02em" }}
          >
            defined
          </span>
        </div>
      </motion.div>

      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground font-sans text-sm transition-colors"
          style={{ letterSpacing: "-0.02em" }}
        >
          go back and edit
        </button>
        <Link
          href={`/teams/${mockTeamId}`}
          className="bg-foreground text-background inline-flex items-center justify-center gap-2 px-6 py-3 font-sans text-sm transition-opacity hover:opacity-90"
          style={{ letterSpacing: "-0.03em" }}
        >
          open role canvas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p
        className="text-muted-foreground/70 mt-8 text-[11px]"
        style={{ letterSpacing: "-0.01em" }}
      >
        you can always add more roles, teams, and metrics later from your
        dashboard.
      </p>
    </motion.div>
  );
}
