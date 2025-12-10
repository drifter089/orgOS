"use client";

import { useState } from "react";

import { motion } from "framer-motion";

interface OrgNameStepProps {
  onNext: () => void;
}

export function OrgNameStep({ onNext }: OrgNameStepProps) {
  const [orgName, setOrgName] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const canContinue = orgName.trim().length > 0;

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
        welcome to ryō
      </h1>
      <p
        className="text-muted-foreground mt-4 max-w-sm"
        style={{ letterSpacing: "-0.02em" }}
      >
        let&apos;s begin by setting up your organization. this will only take a
        few minutes.
      </p>

      <div className="mt-10 space-y-6">
        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            ORGANIZATION NAME
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canContinue) {
                onNext();
              }
            }}
            placeholder="acme inc."
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
            WEBSITE
            <span className="text-muted-foreground/50 ml-2">OPTIONAL</span>
          </label>
          <input
            type="url"
            value={orgUrl}
            onChange={(e) => setOrgUrl(e.target.value)}
            placeholder="https://acme.com"
            className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 w-full rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
            style={{ letterSpacing: "-0.02em" }}
          />
          <p
            className="text-muted-foreground/70 mt-2 text-[11px]"
            style={{ letterSpacing: "-0.01em" }}
          >
            we&apos;ll use this to learn more about your company and personalize
            your experience.
          </p>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-end">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-foreground text-background px-6 py-3 font-sans text-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ letterSpacing: "-0.03em" }}
        >
          continue
        </button>
      </div>
    </motion.div>
  );
}
