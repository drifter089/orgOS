"use client";

import { useState } from "react";

import { motion } from "framer-motion";

interface TeamSetupStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function TeamSetupStep({ onNext, onBack }: TeamSetupStepProps) {
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const canContinue = teamName.trim().length > 0;

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
        create your first team
      </h1>
      <p
        className="text-muted-foreground mt-4 max-w-sm"
        style={{ letterSpacing: "-0.02em" }}
      >
        teams help you organize roles around a shared purpose—like product,
        growth, or operations.
      </p>

      {/* Example team names */}
      <motion.div
        className="mt-8 flex flex-wrap gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {["growth", "product", "operations"].map((example) => (
          <button
            key={example}
            onClick={() => setTeamName(example)}
            className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground rounded-sm border px-3 py-1.5 font-sans text-xs transition-colors"
            style={{ letterSpacing: "-0.02em" }}
          >
            {example}
          </button>
        ))}
      </motion.div>

      <div className="mt-10 space-y-6">
        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            TEAM NAME
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canContinue) {
                onNext();
              }
            }}
            placeholder="e.g., product, growth, engineering"
            className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 w-full rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
            style={{ letterSpacing: "-0.02em" }}
            autoFocus
          />
        </div>

        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            DESCRIPTION
            <span className="text-muted-foreground/50 ml-2">OPTIONAL</span>
          </label>
          <textarea
            value={teamDescription}
            onChange={(e) => setTeamDescription(e.target.value)}
            placeholder="what's this team's mission?"
            rows={3}
            className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 w-full resize-none rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
            style={{ letterSpacing: "-0.02em" }}
          />
        </div>
      </div>

      <div className="mt-10 flex items-center justify-end">
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
            disabled={!canContinue}
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
