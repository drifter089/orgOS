"use client";

import { InsightsCanvas } from "./insights-canvas";
import { MetricsCanvas } from "./metrics-canvas";
import { RoleCanvas } from "./role-canvas";

export function Steps() {
  const steps = [
    {
      number: "01",
      title: "define your roles",
      description:
        "map out the functions that drive your organization forward. clarify ownership, eliminate ambiguity, and create alignment around what needs to be done to win.",
      visual: <RoleCanvas />,
    },
    {
      number: "02",
      title: "connect real-time metrics",
      description:
        "import data from every source. tie each role to measurable outcomes so performance becomes visible, objective, and actionable.",
      visual: <MetricsCanvas />,
    },
    {
      number: "03",
      title: "let ryō surface insights",
      description:
        "automated check-ins analyze your organization continuously. receive clear reports on which areas need attention—before small issues become large problems.",
      visual: <InsightsCanvas />,
    },
  ];

  return (
    <section className="px-6 py-24 sm:px-12 lg:px-20 lg:py-32">
      <div className="mb-16 lg:mb-24">
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          how it works
        </span>
      </div>
      <div className="flex flex-col gap-24 lg:gap-32">
        {steps.map((step, index) => {
          const isReversed = index === 1;
          return (
            <div
              key={step.number}
              className={`flex flex-col items-start gap-12 lg:flex-row lg:items-center lg:gap-20 ${
                isReversed ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Text content */}
              <div className="flex flex-1 flex-col">
                <span
                  className="text-muted-foreground mb-6 font-mono text-xs"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {step.number}
                </span>
                <h3
                  className="text-foreground mb-4 font-sans text-xl sm:text-2xl"
                  style={{ letterSpacing: "-0.03em", lineHeight: "1.1" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-muted-foreground max-w-md text-sm leading-relaxed"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {step.description}
                </p>
              </div>
              {/* Visual area */}
              <div className="w-full flex-1">
                {step.visual ? (
                  step.visual
                ) : (
                  <div className="border-border bg-muted/30 flex aspect-[4/3] w-full items-center justify-center border">
                    <span className="text-muted-foreground/50 font-mono text-[10px] tracking-widest uppercase">
                      visual {step.number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Subtle bottom line */}
      <div className="mt-24 lg:mt-32">
        <div className="bg-border h-px w-full" />
      </div>
    </section>
  );
}
