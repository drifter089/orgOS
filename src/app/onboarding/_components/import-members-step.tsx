"use client";

import { useState } from "react";

import { motion } from "framer-motion";

interface ImportMembersStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ImportMembersStep({ onNext, onBack }: ImportMembersStepProps) {
  const [selectedIntegration, setSelectedIntegration] = useState<
    "slack" | "google" | null
  >(null);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <h1
        className="text-foreground font-sans text-3xl sm:text-4xl"
        style={{ letterSpacing: "-0.03em", lineHeight: "1.1" }}
      >
        bring in your team
      </h1>
      <p
        className="text-muted-foreground mt-4 max-w-sm"
        style={{ letterSpacing: "-0.02em" }}
      >
        connect your workspace to automatically import team members and keep
        everything in sync.
      </p>

      <div className="mt-10 space-y-3">
        {/* Google Workspace option */}
        <button
          onClick={() => setSelectedIntegration("google")}
          className={`flex w-full items-center gap-4 rounded-sm border px-5 py-4 transition-colors ${
            selectedIntegration === "google"
              ? "border-foreground/30 bg-foreground/[0.02]"
              : "border-border hover:border-foreground/20"
          }`}
        >
          <div className="bg-foreground/5 flex h-10 w-10 items-center justify-center rounded-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <div className="text-left">
            <span
              className="text-foreground block font-sans text-sm"
              style={{ letterSpacing: "-0.02em" }}
            >
              connect google workspace
            </span>
            <span
              className="text-muted-foreground font-mono text-[10px]"
              style={{ letterSpacing: "0.02em" }}
            >
              import from directory
            </span>
          </div>
        </button>

        {/* Slack option */}
        <button
          onClick={() => setSelectedIntegration("slack")}
          className={`flex w-full items-center justify-between rounded-sm border px-5 py-4 transition-colors ${
            selectedIntegration === "slack"
              ? "border-foreground/30 bg-foreground/[0.02]"
              : "border-border hover:border-foreground/20"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#4A154B]/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#4A154B">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
            </div>
            <div className="text-left">
              <span
                className="text-foreground block font-sans text-sm"
                style={{ letterSpacing: "-0.02em" }}
              >
                connect slack
              </span>
              <span
                className="text-muted-foreground font-mono text-[10px]"
                style={{ letterSpacing: "0.02em" }}
              >
                import channels & members
              </span>
            </div>
          </div>
          <span
            className="bg-muted text-muted-foreground rounded-sm px-2 py-1 font-mono text-[9px]"
            style={{ letterSpacing: "0.03em" }}
          >
            COMING SOON
          </span>
        </button>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={onNext}
          className="text-muted-foreground hover:text-foreground font-sans text-sm transition-colors"
          style={{ letterSpacing: "-0.02em" }}
        >
          skip for now
        </button>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="border-border text-foreground hover:bg-muted border px-6 py-3 font-sans text-sm transition-colors"
            style={{ letterSpacing: "-0.03em" }}
          >
            back
          </button>
          <button
            onClick={onNext}
            disabled={!selectedIntegration}
            className="bg-foreground text-background px-6 py-3 font-sans text-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ letterSpacing: "-0.03em" }}
          >
            continue
          </button>
        </div>
      </div>
    </motion.div>
  );
}
