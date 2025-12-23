"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

function HeroVisual() {
  const [, setPhase] = useState<"role" | "metric" | "insight">("role");
  const [cursorPosition, setCursorPosition] = useState({ x: 25, y: 35 });
  const [isClicking, setIsClicking] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [showMetric, setShowMetric] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  const metricData = [
    { value: 65 },
    { value: 72 },
    { value: 68 },
    { value: 78 },
    { value: 74 },
    { value: 82 },
    { value: 79 },
    { value: 88 },
  ];

  useEffect(() => {
    const sequence = async () => {
      setShowRole(false);
      setShowMetric(false);
      setShowInsight(false);
      setPhase("role");

      setCursorPosition({ x: 22, y: 30 });
      await delay(600);
      setIsClicking(true);
      await delay(150);
      setIsClicking(false);
      setShowRole(true);
      await delay(1200);

      setPhase("metric");
      setCursorPosition({ x: 55, y: 35 });
      await delay(600);
      setIsClicking(true);
      await delay(150);
      setIsClicking(false);
      setShowMetric(true);
      await delay(1200);

      setPhase("insight");
      setCursorPosition({ x: 38, y: 70 });
      await delay(600);
      setIsClicking(true);
      await delay(150);
      setIsClicking(false);
      setShowInsight(true);
      await delay(2500);

      void sequence();
    };
    void sequence();
  }, []);

  return (
    <div className="border-border relative h-full w-full overflow-hidden rounded-sm border bg-[#faf9f7]">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgb(60, 60, 55) 1px, transparent 1px),
            linear-gradient(90deg, rgb(60, 60, 55) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Corner marks */}
      <div className="border-foreground/8 absolute top-3 left-3 h-3 w-3 border-t border-l" />
      <div className="border-foreground/8 absolute top-3 right-3 h-3 w-3 border-t border-r" />
      <div className="border-foreground/8 absolute bottom-3 left-3 h-3 w-3 border-b border-l" />
      <div className="border-foreground/8 absolute right-3 bottom-3 h-3 w-3 border-r border-b" />

      {/* Role Card */}
      <AnimatePresence>
        {showRole && (
          <motion.div
            className="bg-background/95 border-border absolute rounded-sm border px-4 py-3 shadow-sm backdrop-blur-sm"
            style={{ left: "12%", top: "20%" }}
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "rgb(139, 152, 140)" }}
              />
              <span
                className="text-foreground/70 font-mono text-[10px]"
                style={{ letterSpacing: "0.02em" }}
              >
                role
              </span>
            </div>
            <span
              className="text-foreground block font-sans text-sm"
              style={{ letterSpacing: "-0.02em" }}
            >
              product lead
            </span>
            <span
              className="text-foreground/50 mt-1 block text-[10px] italic"
              style={{ letterSpacing: "0.01em" }}
            >
              ship what matters
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metric Card */}
      <AnimatePresence>
        {showMetric && (
          <motion.div
            className="bg-background/95 border-border absolute rounded-sm border px-4 py-3 shadow-sm backdrop-blur-sm"
            style={{ left: "48%", top: "22%", width: "140px" }}
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "rgb(142, 157, 172)" }}
              />
              <span
                className="text-foreground/70 font-mono text-[10px]"
                style={{ letterSpacing: "0.02em" }}
              >
                metric
              </span>
            </div>
            <span
              className="text-foreground block font-sans text-sm"
              style={{ letterSpacing: "-0.02em" }}
            >
              sprint velocity
            </span>
            <div className="mt-2 flex items-end justify-between">
              <span
                className="font-sans text-lg"
                style={{
                  color: "rgb(142, 157, 172)",
                  letterSpacing: "-0.03em",
                }}
              >
                34
              </span>
              <div className="h-8 w-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricData}>
                    <defs>
                      <linearGradient
                        id="heroMetricGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(142, 157, 172)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(142, 157, 172)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="rgb(142, 157, 172)"
                      strokeWidth={1.5}
                      fill="url(#heroMetricGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insight Card */}
      <AnimatePresence>
        {showInsight && (
          <motion.div
            className="bg-background/95 border-border absolute rounded-sm border px-4 py-3 shadow-sm backdrop-blur-sm"
            style={{ left: "25%", top: "58%" }}
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <motion.div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "rgb(180, 154, 142)" }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
              <span
                className="text-foreground/70 font-mono text-[10px]"
                style={{ letterSpacing: "0.02em" }}
              >
                insight
              </span>
            </div>
            <span
              className="text-foreground block max-w-[180px] font-sans text-sm"
              style={{ letterSpacing: "-0.02em" }}
            >
              GTM team needs attention
            </span>
            <span
              className="text-foreground/50 mt-1 block text-[10px]"
              style={{ letterSpacing: "0.01em" }}
            >
              missing 30% of sign-up target
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Cursor */}
      <motion.div
        className="pointer-events-none absolute z-10"
        style={{
          left: `${cursorPosition.x}%`,
          top: `${cursorPosition.y}%`,
        }}
        animate={{
          left: `${cursorPosition.x}%`,
          top: `${cursorPosition.y}%`,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <motion.svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="drop-shadow-sm"
          animate={{ scale: isClicking ? 0.85 : 1 }}
          transition={{ duration: 0.1 }}
        >
          <path
            d="M5.5 3.21V20.79c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
            fill="rgb(60, 60, 55)"
            fillOpacity="0.85"
          />
          <path
            d="M5.5 3.21V20.79c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
            stroke="#faf9f7"
            strokeWidth="1.5"
          />
        </motion.svg>
        {/* Click ripple */}
        <AnimatePresence>
          {isClicking && (
            <motion.div
              className="absolute top-0 left-0 h-5 w-5 rounded-full"
              style={{ border: "1px solid rgb(139, 152, 140)" }}
              initial={{ scale: 0.5, opacity: 0.7 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-8 sm:px-12 lg:px-20">
        <span
          className="text-foreground font-sans text-xl"
          style={{ letterSpacing: "-0.03em" }}
        >
          ryō
        </span>
        <nav className="flex items-center gap-8">
          <a
            href="/mission"
            className="text-muted-foreground hover:text-foreground font-sans text-sm transition-colors"
            style={{ letterSpacing: "-0.03em" }}
          >
            mission
          </a>
          <a
            href="https://forms.acta.so/r/ODQR7g"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-sans text-sm transition-opacity hover:opacity-70"
            style={{ letterSpacing: "-0.03em" }}
          >
            schedule demo
          </a>
        </nav>
      </header>

      <div className="flex flex-1 flex-col items-center gap-12 px-6 py-12 sm:px-12 lg:flex-row lg:gap-16 lg:px-20 lg:py-0">
        {/* Left: Text content */}
        <div className="max-w-xl flex-1">
          <h1
            className="text-foreground font-sans text-4xl sm:text-5xl lg:text-6xl"
            style={{
              letterSpacing: "-0.03em",
              lineHeight: "1",
            }}
          >
            build your self-optimizing organization.
          </h1>
          <p
            className="text-muted-foreground mt-8 max-w-md"
            style={{ letterSpacing: "-0.03em" }}
          >
            ryō continuously maps your organization, connects every role to
            real-time metrics, and surfaces where attention is needed—so you can
            focus on what matters.
          </p>
          <div className="mt-12 flex gap-4">
            <a
              href="https://forms.acta.so/r/ODQR7g"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background px-6 py-3 font-sans text-sm transition-opacity hover:opacity-90"
              style={{ letterSpacing: "-0.03em" }}
            >
              schedule demo
            </a>
            <button
              className="border-border text-foreground hover:bg-muted border px-6 py-3 font-sans text-sm transition-colors"
              style={{ letterSpacing: "-0.03em" }}
            >
              watch video
            </button>
          </div>
        </div>

        {/* Right: Hero visual canvas */}
        <div className="aspect-[4/3] w-full max-w-lg flex-1 lg:max-w-xl">
          <HeroVisual />
        </div>
      </div>

      {/* Subtle bottom line */}
      <div className="relative z-10 px-6 py-8 sm:px-12 lg:px-20">
        <div className="bg-border h-px w-full" />
      </div>
    </section>
  );
}
