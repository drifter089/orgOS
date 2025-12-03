"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const insightData = {
  title: "go-to-market needs attention",
  message:
    "the go-to-market team is missing 30% of sign-up targets for this week",
  severity: "attention",
  roles: [
    {
      name: "growth lead",
      status: "behind",
      metric: "sign-ups",
      value: "70%",
      color: "rgb(180, 154, 142)",
    },
    {
      name: "content strategist",
      status: "on track",
      metric: "engagement",
      value: "102%",
      color: "rgb(139, 152, 140)",
    },
    {
      name: "sales lead",
      status: "behind",
      metric: "conversions",
      value: "84%",
      color: "rgb(142, 157, 172)",
    },
  ],
  chartData: [
    { actual: 45, target: 60 },
    { actual: 52, target: 65 },
    { actual: 48, target: 70 },
    { actual: 55, target: 75 },
    { actual: 51, target: 80 },
    { actual: 58, target: 85 },
    { actual: 54, target: 90 },
  ],
};

export function InsightsCanvas() {
  const [phase, setPhase] = useState<
    "initial" | "card" | "cursor" | "expanded"
  >("initial");
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const sequence = async () => {
      await new Promise((r) => setTimeout(r, 800));
      setPhase("card");
      await new Promise((r) => setTimeout(r, 1500));
      setPhase("cursor");
      setCursorPos({ x: 50, y: 40 });
      await new Promise((r) => setTimeout(r, 1200));
      setPhase("expanded");
      await new Promise((r) => setTimeout(r, 5000));
      setPhase("initial");
      setCursorPos({ x: 50, y: 50 });
    };
    void sequence();
    const interval = setInterval(() => {
      void sequence();
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-border relative aspect-[4/3] w-full overflow-hidden rounded-sm border bg-[#faf9f7] p-4 sm:p-6">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgb(60, 60, 55) 1px, transparent 1px),
            linear-gradient(90deg, rgb(60, 60, 55) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Header */}
      <div className="relative mb-4 sm:mb-6">
        <span
          className="text-foreground/40 font-mono text-[8px] uppercase sm:text-[9px]"
          style={{ letterSpacing: "0.1em" }}
        >
          automated insights
        </span>
        <motion.div
          className="absolute top-0 right-0 flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-foreground/30 font-mono text-[8px]">1 new</span>
          <motion.div
            className="h-2 w-2 rounded-full bg-[rgb(180,154,142)]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
        </motion.div>
      </div>

      {/* Content area */}
      <div className="relative flex h-[calc(100%-3rem)] items-center justify-center">
        <AnimatePresence mode="wait">
          {phase !== "initial" && phase !== "expanded" && (
            <motion.div
              key="card-collapsed"
              className="border-border/50 absolute w-[85%] cursor-pointer rounded-sm border bg-[#fdfcfb] p-4"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                borderColor:
                  phase === "cursor"
                    ? "rgb(180, 154, 142)"
                    : "rgba(0,0,0,0.06)",
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Notification dot */}
              <motion.div
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[rgb(180,154,142)]"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              />
              <div className="flex items-start gap-3">
                <div className="h-full min-h-[2.5rem] w-1 rounded-full bg-[rgb(180,154,142)]/60" />
                <div className="flex-1">
                  <p
                    className="mb-1.5 font-mono text-[8px] text-[rgb(180,154,142)] uppercase"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {insightData.severity}
                  </p>
                  <p
                    className="text-foreground/80 text-xs sm:text-sm"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {insightData.message}
                  </p>
                  <p
                    className="text-foreground/30 mt-2 font-mono text-[8px]"
                    style={{ letterSpacing: "0.02em" }}
                  >
                    click to explore →
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "expanded" && (
            <motion.div
              key="card-expanded"
              className="absolute w-[90%] overflow-hidden rounded-sm border border-[rgb(180,154,142)]/30 bg-[#fdfcfb] p-4"
              initial={{ opacity: 0, scale: 0.9, height: "auto" }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p
                    className="mb-1 font-mono text-[8px] text-[rgb(180,154,142)] uppercase"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {insightData.severity}
                  </p>
                  <p
                    className="text-foreground/90 text-sm font-medium"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {insightData.title}
                  </p>
                </div>
                <span className="text-foreground/30 font-mono text-[8px]">
                  this week
                </span>
              </div>

              {/* Chart */}
              <motion.div
                className="relative mb-4 h-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={insightData.chartData}
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="targetGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(139, 152, 140)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(139, 152, 140)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="actualGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(180, 154, 142)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(180, 154, 142)"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="target"
                      stroke="rgb(139, 152, 140)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      fill="url(#targetGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="rgb(180, 154, 142)"
                      strokeWidth={1.5}
                      fill="url(#actualGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="absolute right-0 bottom-0 flex gap-3">
                  <span className="text-foreground/30 flex items-center gap-1 font-mono text-[7px]">
                    <span
                      className="h-px w-3 bg-[rgb(139,152,140)]"
                      style={{ opacity: 0.5 }}
                    />{" "}
                    target
                  </span>
                  <span className="text-foreground/30 flex items-center gap-1 font-mono text-[7px]">
                    <span className="h-px w-3 bg-[rgb(180,154,142)]" /> actual
                  </span>
                </div>
              </motion.div>

              {/* Roles breakdown */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p
                  className="text-foreground/40 mb-2 font-mono text-[8px] uppercase"
                  style={{ letterSpacing: "0.05em" }}
                >
                  team breakdown
                </p>
                {insightData.roles.map((role, index) => (
                  <motion.div
                    key={role.name}
                    className="border-border/30 flex items-center justify-between border-b py-1.5 last:border-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span
                        className="text-foreground/70 text-[11px]"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {role.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground/40 font-mono text-[8px]">
                        {role.metric}
                      </span>
                      <span
                        className="font-mono text-[10px]"
                        style={{
                          color:
                            role.status === "behind"
                              ? "rgb(180, 154, 142)"
                              : "rgb(139, 152, 140)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {role.value}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated cursor */}
        <motion.div
          className="pointer-events-none absolute z-20"
          initial={{ opacity: 0 }}
          animate={{
            opacity: phase === "cursor" ? 1 : 0,
            left: `${cursorPos.x}%`,
            top: `${cursorPos.y}%`,
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Cursor */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-sm"
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
              fill="rgb(60, 60, 55)"
              stroke="rgb(250, 249, 247)"
              strokeWidth="1.5"
            />
          </svg>
          {/* Click ripple */}
          {phase === "cursor" && (
            <motion.div
              className="border-foreground/20 absolute top-0 left-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border"
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            />
          )}
        </motion.div>
      </div>

      {/* Corner marks */}
      <div className="border-foreground/8 absolute top-3 left-3 h-3 w-3 border-t border-l" />
      <div className="border-foreground/8 absolute top-3 right-3 h-3 w-3 border-t border-r" />
      <div className="border-foreground/8 absolute bottom-3 left-3 h-3 w-3 border-b border-l" />
      <div className="border-foreground/8 absolute right-3 bottom-3 h-3 w-3 border-r border-b" />
    </div>
  );
}
