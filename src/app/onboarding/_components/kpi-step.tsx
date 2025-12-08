"use client";

import { useState } from "react";

import { motion } from "framer-motion";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface KpiStepProps {
  onNext: () => void;
  onBack: () => void;
}

type GoalType = "absolute" | "relative";

export function KpiStep({ onNext, onBack }: KpiStepProps) {
  const [kpiName, setKpiName] = useState("");
  const [integrationSource, setIntegrationSource] = useState<string>("");
  const [goalType, setGoalType] = useState<GoalType>("absolute");
  const [absoluteGoal, setAbsoluteGoal] = useState("");
  const [relativeGoal, setRelativeGoal] = useState("");
  const [relativePeriod, setRelativePeriod] = useState("month");

  const handleAbsoluteGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAbsoluteGoal(value);
    }
  };

  const handleRelativeGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setRelativeGoal(value);
    }
  };

  const integrationOptions = [
    { value: "manual", label: "manual entry" },
    { value: "google-sheets", label: "google sheets" },
    { value: "github", label: "github" },
    { value: "posthog", label: "posthog" },
    { value: "youtube", label: "youtube" },
    { value: "slack", label: "slack" },
  ];

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
        track what matters
      </h1>
      <p
        className="text-muted-foreground mt-4 max-w-sm"
        style={{ letterSpacing: "-0.02em" }}
      >
        connect a key metric to this role. what number should they move?
      </p>

      {/* Example metrics */}
      <motion.div
        className="mt-8 flex flex-wrap gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {["MRR", "NPS score", "conversion rate", "churn %", "active users"].map(
          (example) => (
            <button
              key={example}
              onClick={() => setKpiName(example)}
              className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground rounded-sm border px-3 py-1.5 font-sans text-xs transition-colors"
              style={{ letterSpacing: "-0.02em" }}
            >
              {example}
            </button>
          ),
        )}
      </motion.div>

      <div className="mt-10 space-y-6">
        {/* Metric Name */}
        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            METRIC NAME
          </label>
          <input
            type="text"
            value={kpiName}
            onChange={(e) => setKpiName(e.target.value)}
            placeholder="e.g., monthly recurring revenue"
            className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 w-full rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
            style={{ letterSpacing: "-0.02em" }}
            autoFocus
          />
        </div>

        {/* Integration Source */}
        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            DATA SOURCE
          </label>
          <Select
            value={integrationSource}
            onValueChange={setIntegrationSource}
          >
            <SelectTrigger className="border-border h-auto w-full bg-transparent px-4 py-3">
              <SelectValue placeholder="select integration source" />
            </SelectTrigger>
            <SelectContent>
              {integrationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Goal Type Toggle */}
        <div>
          <label
            className="text-muted-foreground mb-3 block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            GOAL TYPE
          </label>
          <ToggleGroup
            type="single"
            value={goalType}
            onValueChange={(value) => {
              if (value) setGoalType(value as GoalType);
            }}
            variant="outline"
            className="w-full"
          >
            <ToggleGroupItem value="absolute" className="flex-1">
              <span
                className="font-sans text-sm"
                style={{ letterSpacing: "-0.02em" }}
              >
                absolute
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem value="relative" className="flex-1">
              <span
                className="font-sans text-sm"
                style={{ letterSpacing: "-0.02em" }}
              >
                relative
              </span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Goal Inputs */}
        {goalType === "absolute" ? (
          <div>
            <label
              className="text-muted-foreground mb-3 block font-mono text-[10px]"
              style={{ letterSpacing: "0.05em" }}
            >
              TARGET VALUE
            </label>
            <input
              type="number"
              value={absoluteGoal}
              onChange={handleAbsoluteGoalChange}
              placeholder="e.g., 100000"
              step="any"
              min="0"
              className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 w-full rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
              style={{ letterSpacing: "-0.02em" }}
            />
            <p
              className="text-muted-foreground/70 mt-2 text-[11px]"
              style={{ letterSpacing: "-0.01em" }}
            >
              enter a numeric target value.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                className="text-muted-foreground mb-3 block font-mono text-[10px]"
                style={{ letterSpacing: "0.05em" }}
              >
                PERCENTAGE INCREASE
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={relativeGoal}
                  onChange={handleRelativeGoalChange}
                  placeholder="e.g., 20"
                  step="any"
                  min="0"
                  max="1000"
                  className="border-border text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 flex-1 rounded-sm border bg-transparent px-4 py-3 font-sans transition-colors focus:outline-none"
                  style={{ letterSpacing: "-0.02em" }}
                />
                <span className="text-muted-foreground flex items-center font-sans text-sm">
                  %
                </span>
              </div>
            </div>
            <div>
              <label
                className="text-muted-foreground mb-3 block font-mono text-[10px]"
                style={{ letterSpacing: "0.05em" }}
              >
                TIME PERIOD
              </label>
              <Select value={relativePeriod} onValueChange={setRelativePeriod}>
                <SelectTrigger className="border-border h-auto w-full bg-transparent px-4 py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">per week</SelectItem>
                  <SelectItem value="month">per month</SelectItem>
                  <SelectItem value="quarter">per quarter</SelectItem>
                  <SelectItem value="year">per year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p
              className="text-muted-foreground/70 text-[11px]"
              style={{ letterSpacing: "-0.01em" }}
            >
              track growth as a percentage increase over time.
            </p>
          </div>
        )}
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
            className="bg-foreground text-background px-6 py-3 font-sans text-sm transition-opacity hover:opacity-90"
            style={{ letterSpacing: "-0.03em" }}
          >
            continue
          </button>
        </div>
      </div>
    </motion.div>
  );
}
