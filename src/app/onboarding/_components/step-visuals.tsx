"use client";

import { motion } from "framer-motion";

// Shared animation config
const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Step 1: Organization building visualization
export function OrgNameVisual() {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgb(60, 60, 55) 1px, transparent 1px),
            linear-gradient(90deg, rgb(60, 60, 55) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Abstract building blocks */}
      <div className="relative">
        <motion.div
          className="border-border bg-background/50 h-40 w-32 border"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />
        <motion.div
          className="border-border bg-background/50 absolute -top-8 -right-8 h-24 w-24 border"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        />
        <motion.div
          className="border-foreground/20 bg-foreground/5 absolute -bottom-6 -left-10 h-20 w-20 border"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        />

        {/* Label */}
        <motion.div
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <span
            className="text-muted-foreground font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            YOUR ORGANIZATION
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Step 2: Connected people visualization
export function ImportMembersVisual() {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      <div className="relative">
        {/* Center node */}
        <motion.div
          className="border-foreground/20 bg-background flex h-16 w-16 items-center justify-center rounded-full border-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="bg-foreground/10 h-8 w-8 rounded-full" />
        </motion.div>

        {/* Orbiting nodes */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const radius = 80;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          return (
            <motion.div
              key={angle}
              className="border-border bg-background/80 absolute h-10 w-10 rounded-full border"
              style={{
                left: `calc(50% + ${x}px - 20px)`,
                top: `calc(50% + ${y}px - 20px)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full">
                <div className="bg-muted h-4 w-4 rounded-full" />
              </div>
            </motion.div>
          );
        })}

        {/* Connection lines */}
        <svg
          className="absolute inset-0 h-full w-full"
          style={{
            left: "-72px",
            top: "-72px",
            width: "200px",
            height: "200px",
          }}
        >
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const radius = 80;
            const x = Math.cos((angle * Math.PI) / 180) * radius + 100;
            const y = Math.sin((angle * Math.PI) / 180) * radius + 100;
            return (
              <motion.line
                key={angle}
                x1="100"
                y1="100"
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-border"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
              />
            );
          })}
        </svg>

        {/* Label */}
        <motion.div
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <span
            className="text-muted-foreground font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            TEAM MEMBERS
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Step 3: Team structure visualization
export function TeamSetupVisual() {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      <div className="relative space-y-4">
        {/* Team cards */}
        {["product", "growth", "engineering"].map((team, i) => (
          <motion.div
            key={team}
            className={`bg-background rounded-sm border px-6 py-4 ${
              i === 0 ? "border-foreground/30" : "border-border"
            }`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-2 w-2 rounded-full ${
                  i === 0 ? "bg-foreground" : "bg-muted-foreground/30"
                }`}
              />
              <span
                className={`font-sans text-sm ${
                  i === 0 ? "text-foreground" : "text-muted-foreground/50"
                }`}
                style={{ letterSpacing: "-0.02em" }}
              >
                {team}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Label */}
        <motion.div
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <span
            className="text-muted-foreground font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            ORGANIZE BY PURPOSE
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Step 4: Educational breakdown visualization
export function RoleCreationVisual() {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      <motion.div
        className="bg-background border-border/60 w-full max-w-md rounded-sm border p-6 shadow-sm"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <p
          className="text-muted-foreground mb-6 font-mono text-[10px]"
          style={{ letterSpacing: "0.05em" }}
        >
          INSTEAD OF &quot;MARKETING MANAGER&quot;...
        </p>
        <div className="space-y-4">
          <motion.div
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <span className="text-muted-foreground/60 text-lg">→</span>
            <div>
              <span
                className="text-foreground/70 font-mono text-[10px]"
                style={{ letterSpacing: "0.03em" }}
              >
                TITLE
              </span>
              <span
                className="text-muted-foreground ml-2 font-sans text-sm"
                style={{ letterSpacing: "-0.02em" }}
              >
                what your company needs
              </span>
              <p
                className="text-foreground/80 mt-1 font-sans text-sm italic"
                style={{ letterSpacing: "-0.02em" }}
              >
                &quot;growth engine&quot;
              </p>
            </div>
          </motion.div>
          <motion.div
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
            <span className="text-muted-foreground/60 text-lg">→</span>
            <div>
              <span
                className="text-foreground/70 font-mono text-[10px]"
                style={{ letterSpacing: "0.03em" }}
              >
                PURPOSE
              </span>
              <span
                className="text-muted-foreground ml-2 font-sans text-sm"
                style={{ letterSpacing: "-0.02em" }}
              >
                why this role exists
              </span>
              <p
                className="text-foreground/80 mt-1 font-sans text-sm italic"
                style={{ letterSpacing: "-0.02em" }}
              >
                &quot;to acquire customers efficiently&quot;
              </p>
            </div>
          </motion.div>
          <motion.div
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            <span className="text-muted-foreground/60 text-lg">→</span>
            <div>
              <span
                className="text-foreground/70 font-mono text-[10px]"
                style={{ letterSpacing: "0.03em" }}
              >
                ACCOUNTABILITIES
              </span>
              <span
                className="text-muted-foreground ml-2 font-sans text-sm"
                style={{ letterSpacing: "-0.02em" }}
              >
                what they own
              </span>
              <p
                className="text-foreground/80 mt-1 font-sans text-sm italic"
                style={{ letterSpacing: "-0.02em" }}
              >
                &quot;manage paid acquisition, optimize funnel&quot;
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Step 5: KPI/Metric visualization
export function KpiVisual() {
  const dataPoints = [35, 42, 38, 55, 48, 62, 58, 72];

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      <motion.div
        className="bg-background border-border w-72 rounded-sm border p-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {/* Metric header */}
        <div className="mb-2 flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: "rgb(142, 157, 172)" }}
          />
          <span
            className="text-muted-foreground font-mono text-[10px]"
            style={{ letterSpacing: "0.02em" }}
          >
            metric
          </span>
        </div>

        <span
          className="text-foreground block font-sans text-sm"
          style={{ letterSpacing: "-0.02em" }}
        >
          monthly recurring revenue
        </span>

        {/* Value and chart */}
        <div className="mt-4 flex items-end justify-between">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <span
              className="text-foreground font-sans text-3xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              $47k
            </span>
            <span
              className="text-muted-foreground ml-2 font-mono text-[10px]"
              style={{ letterSpacing: "0.02em" }}
            >
              +12%
            </span>
          </motion.div>

          {/* Mini chart */}
          <motion.svg
            width="80"
            height="40"
            viewBox="0 0 80 40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <defs>
              <linearGradient id="kpiGradient" x1="0" y1="0" x2="0" y2="1">
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
            <motion.path
              d={`M0,${40 - dataPoints[0] * 0.5} ${dataPoints.map((p, i) => `L${i * 11.4},${40 - p * 0.5}`).join(" ")} L80,${40 - dataPoints[7] * 0.5} L80,40 L0,40 Z`}
              fill="url(#kpiGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            />
            <motion.path
              d={`M0,${40 - dataPoints[0] * 0.5} ${dataPoints.map((p, i) => `L${i * 11.4},${40 - p * 0.5}`).join(" ")}`}
              fill="none"
              stroke="rgb(142, 157, 172)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            />
          </motion.svg>
        </div>

        {/* Target */}
        <motion.div
          className="border-border/50 mt-4 border-t pt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <span
            className="text-muted-foreground font-mono text-[9px]"
            style={{ letterSpacing: "0.03em" }}
          >
            TARGET: $100K
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Step 6: Completion celebration visualization
export function FinishVisual() {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      <div className="relative">
        {/* Connected structure */}
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="absolute -top-[100px] -left-[100px]"
        >
          {/* Lines */}
          <motion.line
            x1="100"
            y1="60"
            x2="60"
            y2="120"
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          />
          <motion.line
            x1="100"
            y1="60"
            x2="140"
            y2="120"
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          />
          <motion.line
            x1="60"
            y1="120"
            x2="100"
            y2="160"
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          />
          <motion.line
            x1="140"
            y1="120"
            x2="100"
            y2="160"
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          />
        </svg>

        {/* Nodes */}
        <motion.div
          className="border-foreground bg-background absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border-2"
          style={{ left: 0, top: "-40px" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <span className="text-foreground font-mono text-[8px]">ORG</span>
        </motion.div>

        <motion.div
          className="border-border bg-background absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border"
          style={{ left: "-40px", top: "20px" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <span className="text-muted-foreground font-mono text-[7px]">
            TEAM
          </span>
        </motion.div>

        <motion.div
          className="border-border bg-background absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border"
          style={{ left: "40px", top: "20px" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <span className="text-muted-foreground font-mono text-[7px]">
            ROLE
          </span>
        </motion.div>

        <motion.div
          className="border-border bg-background absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border"
          style={{ left: 0, top: "60px" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <span className="text-muted-foreground font-mono text-[7px]">
            KPI
          </span>
        </motion.div>

        {/* Checkmark */}
        <motion.div
          className="bg-foreground absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
          style={{ left: "50px", top: "-30px" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, duration: 0.3, type: "spring" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-background"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>

        {/* Label */}
        <motion.div
          className="absolute -bottom-24 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <span
            className="text-muted-foreground block font-mono text-[10px]"
            style={{ letterSpacing: "0.05em" }}
          >
            READY TO GO
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
