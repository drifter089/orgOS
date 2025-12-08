"use client";

import { useState } from "react";

import { motion } from "framer-motion";

interface RoleCreationStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function RoleCreationStep({ onNext, onBack }: RoleCreationStepProps) {
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [accountabilities, setAccountabilities] = useState("");

  const canContinue = title.trim().length > 0 && purpose.trim().length > 0;

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
        define your first role
      </h1>
      <p
        className="text-muted-foreground mt-4 max-w-sm"
        style={{ letterSpacing: "-0.02em" }}
      >
        forget job titles. think about what your company needs to succeed, then
        work backwards.
      </p>

      <div className="mt-10 space-y-6">
        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            ROLE TITLE
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="what does your company need?"
            className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 w-full rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
            style={{ letterSpacing: "-0.02em" }}
            autoFocus
          />
          <p
            className="text-muted-foreground/70 mt-2 text-[11px]"
            style={{ letterSpacing: "-0.01em" }}
          >
            think outcomes, not job titles. &quot;revenue driver&quot; beats
            &quot;sales rep&quot;.
          </p>
        </div>

        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            PURPOSE
          </label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="why should this role exist? what problem does it solve?"
            rows={3}
            className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 w-full resize-none rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
            style={{ letterSpacing: "-0.02em" }}
          />
          <p
            className="text-muted-foreground/70 mt-2 text-[11px]"
            style={{ letterSpacing: "-0.01em" }}
          >
            if you can&apos;t explain why, you might not need it yet.
          </p>
        </div>

        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            ACCOUNTABILITIES
            <span className="text-muted-foreground/50 ml-2">OPTIONAL</span>
          </label>
          <textarea
            value={accountabilities}
            onChange={(e) => setAccountabilities(e.target.value)}
            placeholder="what specific outcomes is this role responsible for?"
            rows={4}
            className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 w-full resize-none rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
            style={{ letterSpacing: "-0.02em" }}
          />
          <p
            className="text-muted-foreground/70 mt-2 text-[11px]"
            style={{ letterSpacing: "-0.01em" }}
          >
            list the key things this role must deliver. one per line works
            great.
          </p>
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
