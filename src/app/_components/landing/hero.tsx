"use client";

import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

function HeroVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Mini preview elements
  const previewElements = [
    {
      type: "role",
      label: "product lead",
      purpose: "ship what matters",
      x: 5,
      y: 15,
      color: "rgb(139, 152, 140)",
    },
    {
      type: "metric",
      label: "sprint velocity",
      value: "34",
      x: 55,
      y: 8,
      color: "rgb(142, 157, 172)",
    },
    {
      type: "role",
      label: "customer learner",
      x: 25,
      y: 45,
      color: "rgb(180, 154, 142)",
    },
    {
      type: "insight",
      label: "GTM needs attention",
      x: 50,
      y: 55,
      color: "rgb(180, 154, 142)",
    },
    {
      type: "metric",
      label: "NPS",
      value: "72",
      x: 10,
      y: 75,
      color: "rgb(139, 152, 140)",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Grid that reveals on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isHovering
            ? `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(60, 60, 55, 0.03) 0%, transparent 60%)`
            : "transparent",
        }}
      >
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: isHovering ? 0.4 : 0,
            backgroundImage: `
              linear-gradient(rgba(60, 60, 55, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(60, 60, 55, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            maskImage: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 70%)`,
            WebkitMaskImage: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* Mini floating elements on the right */}
      <div className="absolute top-1/2 right-8 hidden h-64 w-48 -translate-y-1/2 sm:right-16 lg:right-24 lg:block">
        {previewElements.map((el, index) => (
          <motion.div
            key={el.label}
            className="absolute"
            style={{ left: `${el.x}%`, top: `${el.y}%` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: isHovering ? 0.9 : 0.4,
              y: 0,
              scale: isHovering ? 1.02 : 1,
            }}
            transition={{
              delay: index * 0.1,
              duration: 0.4,
            }}
          >
            {el.type === "role" && (
              <div className="bg-background/80 border-border/50 rounded-sm border px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                <div
                  className="mb-1 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: el.color }}
                />
                <span
                  className="text-foreground/60 font-mono text-[8px]"
                  style={{ letterSpacing: "0.02em" }}
                >
                  {el.label}
                </span>
                {el.purpose && (
                  <span className="text-foreground/40 block pl-4 font-mono text-[8px]">
                    {el.purpose}
                  </span>
                )}
              </div>
            )}
            {el.type === "metric" && (
              <div className="bg-background/80 border-border/50 rounded-sm border px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                <span className="text-foreground/40 mb-1 block font-mono text-[8px]">
                  {el.label}
                </span>
                <div className="flex items-end gap-2">
                  <span
                    className="text-sm"
                    style={{ color: el.color, letterSpacing: "-0.03em" }}
                  >
                    {el.value}
                  </span>
                  {/* Mini sparkline */}
                  <svg width="40" height="16" className="opacity-50">
                    <path
                      d="M0,12 L8,8 L16,10 L24,4 L32,6 L40,2"
                      fill="none"
                      stroke={el.color}
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>
            )}
            {el.type === "insight" && (
              <div className="bg-background/80 border-border/50 rounded-sm border px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                <motion.div
                  className="mb-1 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: el.color }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
                <span className="text-foreground/60 font-mono text-[8px]">
                  {el.label}
                </span>
              </div>
            )}
          </motion.div>
        ))}

        {/* Subtle connection lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: isHovering ? 0.3 : 0.1 }}
        >
          <motion.line
            x1="25%"
            y1="30%"
            x2="70%"
            y2="25%"
            stroke="rgb(60, 60, 55)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
          <motion.line
            x1="45%"
            y1="60%"
            x2="80%"
            y2="70%"
            stroke="rgb(60, 60, 55)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.8 }}
          />
        </svg>
      </div>

      {/* Subtle ambient floating dots */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="bg-foreground/10 absolute h-1 w-1 rounded-full"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4 + i,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col">
      {/* Interactive background */}
      <HeroVisual />

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
            href="#mission"
            className="text-muted-foreground hover:text-foreground font-sans text-sm transition-colors"
            style={{ letterSpacing: "-0.03em" }}
          >
            mission
          </a>
          <a
            href="#demo"
            className="text-foreground font-sans text-sm transition-opacity hover:opacity-70"
            style={{ letterSpacing: "-0.03em" }}
          >
            schedule demo
          </a>
        </nav>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 lg:py-0">
        <h1
          className="text-foreground max-w-3xl font-sans text-4xl sm:text-5xl lg:text-6xl xl:text-7xl"
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
          <button
            className="bg-foreground text-background px-6 py-3 font-sans text-sm transition-opacity hover:opacity-90"
            style={{ letterSpacing: "-0.03em" }}
          >
            schedule demo
          </button>
          <button
            className="border-border text-foreground hover:bg-muted border px-6 py-3 font-sans text-sm transition-colors"
            style={{ letterSpacing: "-0.03em" }}
          >
            watch video
          </button>
        </div>
      </div>

      {/* Subtle bottom line */}
      <div className="relative z-10 px-6 py-8 sm:px-12 lg:px-20">
        <div className="bg-border h-px w-full" />
      </div>
    </section>
  );
}
