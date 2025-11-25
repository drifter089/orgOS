"use client";

import { useRef } from "react";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  CheckCircle2,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const BENEFITS = [
  {
    icon: Target,
    title: "Crystal Clear Accountability",
    description:
      "Every role has a defined purpose and accountabilities. No more confusion about who owns what.",
    stat: "40% reduction in role ambiguity",
  },
  {
    icon: Zap,
    title: "Organizational Agility",
    description:
      "Adapt quickly to change by evolving roles and structure in real-time, not through lengthy reorganizations.",
    stat: "3x faster structural changes",
  },
  {
    icon: Users,
    title: "Distributed Authority",
    description:
      "Empower teams with clear decision-making domains. Reduce bottlenecks and increase autonomy.",
    stat: "60% fewer approval delays",
  },
  {
    icon: TrendingUp,
    title: "Data-Driven Growth",
    description:
      "Track KPIs at every level. Make informed decisions based on real-time metrics, not gut feelings.",
    stat: "2x improvement in goal achievement",
  },
  {
    icon: CheckCircle2,
    title: "Complete Transparency",
    description:
      "Everyone sees the full organizational structure. Foster trust through visibility and clarity.",
    stat: "85% team satisfaction increase",
  },
  {
    icon: Shield,
    title: "Scalable Structure",
    description:
      "Grow from 10 to 1000+ people without losing clarity. Your org structure scales with you.",
    stat: "Built for organizations of any size",
  },
];

export function BenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!cardsRef.current) return;

      gsap.from(cardsRef.current.children, {
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 80%",
          end: "bottom 20%",
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="bg-background w-full px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Why Role-Based Organization?
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-3xl text-lg">
            Traditional hierarchies create bottlenecks and confusion. Role-based
            structure brings clarity, agility, and accountability to modern
            organizations.
          </p>
        </div>

        <div
          ref={cardsRef}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-card border-border/50 group relative overflow-hidden rounded-2xl border p-8 shadow-sm transition-all hover:shadow-xl"
              >
                <div className="bg-primary/5 mb-6 inline-flex rounded-xl p-3">
                  <Icon className="text-primary size-6" />
                </div>

                <h3 className="text-foreground mb-3 text-xl font-semibold">
                  {benefit.title}
                </h3>

                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  {benefit.description}
                </p>

                <div className="border-border/50 border-t pt-4">
                  <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                    {benefit.stat}
                  </p>
                </div>

                {/* Hover effect */}
                <div className="bg-primary/5 absolute inset-0 -z-10 translate-y-full transition-transform group-hover:translate-y-0" />
              </div>
            );
          })}
        </div>

        {/* Comparison Section */}
        <div className="mt-24">
          <div className="bg-card/50 border-border/50 rounded-3xl border p-8 md:p-12">
            <h3 className="text-foreground mb-8 text-center text-2xl font-semibold">
              Traditional vs Role-Based
            </h3>
            <div className="grid gap-8 md:grid-cols-2">
              {/* Traditional */}
              <div>
                <h4 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
                  Traditional Hierarchy
                </h4>
                <ul className="space-y-3">
                  {[
                    "Rigid structure, slow to change",
                    "Authority concentrated at top",
                    "Unclear responsibilities",
                    "Political decision-making",
                    "Limited visibility",
                  ].map((item, index) => (
                    <li
                      key={index}
                      className="text-muted-foreground flex items-start gap-2 text-sm"
                    >
                      <span className="text-destructive mt-0.5">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Role-Based */}
              <div>
                <h4 className="text-primary mb-4 text-sm font-semibold tracking-wider uppercase">
                  Role-Based Organization
                </h4>
                <ul className="space-y-3">
                  {[
                    "Flexible, adapts in real-time",
                    "Distributed decision-making",
                    "Crystal clear accountabilities",
                    "Data-driven insights",
                    "Complete transparency",
                  ].map((item, index) => (
                    <li
                      key={index}
                      className="text-foreground flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="text-primary mt-0.5 size-4 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
