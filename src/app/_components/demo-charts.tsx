"use client";

import { useRef } from "react";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

gsap.registerPlugin(ScrollTrigger);

const DEMO_METRICS = [
  {
    name: "Customer Satisfaction",
    value: 87,
    target: 90,
    type: "percentage",
    trend: "+5%",
  },
  {
    name: "Team Velocity",
    value: 42,
    target: 50,
    type: "number",
    trend: "+12",
  },
  {
    name: "Response Time",
    value: 2.3,
    target: 2.0,
    type: "duration",
    trend: "-0.5h",
  },
  {
    name: "Conversion Rate",
    value: 3.2,
    target: 4.0,
    type: "percentage",
    trend: "+0.8%",
  },
];

const DEMO_ROLES = [
  {
    title: "Product Lead",
    purpose: "Drive product vision and strategy",
    metrics: 3,
    team: "Product Team",
  },
  {
    title: "Engineering Manager",
    purpose: "Ensure technical excellence and delivery",
    metrics: 5,
    team: "Engineering",
  },
  {
    title: "Customer Success",
    purpose: "Maximize customer value and satisfaction",
    metrics: 4,
    team: "Customer Team",
  },
];

export function DemoCharts() {
  const sectionRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!metricsRef.current || !rolesRef.current) return;

      gsap.from(metricsRef.current.children, {
        scrollTrigger: {
          trigger: metricsRef.current,
          start: "top 80%",
          end: "bottom 20%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
      });

      gsap.from(rolesRef.current.children, {
        scrollTrigger: {
          trigger: rolesRef.current,
          start: "top 80%",
          end: "bottom 20%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="bg-background w-full px-6 py-24"
      id="demo"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            See It In Action
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            Real-time insights and visual organization structure at your
            fingertips
          </p>
        </div>

        {/* Metrics Demo */}
        <div className="mb-16">
          <h3 className="text-foreground mb-8 text-2xl font-semibold">
            Track What Matters
          </h3>
          <div
            ref={metricsRef}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {DEMO_METRICS.map((metric, index) => (
              <Card key={index} className="border-border/50 bg-card/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">
                    {metric.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">
                        {metric.value}
                        {metric.type === "percentage" && "%"}
                        {metric.type === "duration" && "h"}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        / {metric.target}
                        {metric.type === "percentage" && "%"}
                        {metric.type === "duration" && "h"}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {metric.trend}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${(metric.value / metric.target) * 100}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Roles Demo */}
        <div>
          <h3 className="text-foreground mb-8 text-2xl font-semibold">
            Crystal Clear Roles
          </h3>
          <div ref={rolesRef} className="grid gap-6 md:grid-cols-3">
            {DEMO_ROLES.map((role, index) => (
              <Card
                key={index}
                className="border-border/50 bg-card/50 transition-all hover:shadow-lg"
              >
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-2 inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium">
                    {role.team}
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {role.purpose}
                  </p>
                  <div className="border-border/50 border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Metrics</span>
                      <span className="text-foreground font-semibold">
                        {role.metrics}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
