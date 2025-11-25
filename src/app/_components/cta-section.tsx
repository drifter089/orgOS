"use client";

import { useRef } from "react";

import Link from "next/link";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger);

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!contentRef.current) return;

      gsap.from(contentRef.current, {
        scrollTrigger: {
          trigger: contentRef.current,
          start: "top 80%",
        },
        y: 60,
        opacity: 0,
        duration: 1,
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="bg-background relative w-full overflow-hidden px-6 py-24"
    >
      {/* Gradient background */}
      <div className="absolute inset-0">
        <div className="bg-primary/30 absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div className="bg-secondary/30 absolute right-1/4 bottom-0 h-[500px] w-[500px] rounded-full blur-[120px]" />
      </div>

      <div
        ref={contentRef}
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        <div className="bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
          <Sparkles className="size-4" />
          <span>Join organizations transforming their structure</span>
        </div>

        <h2 className="text-foreground mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Ready to Transform Your Organization?
        </h2>

        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-lg">
          Start building clarity, accountability, and agility into your team
          structure today. No credit card required.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="group text-lg font-semibold" asChild>
            <Link href="/api/auth/login">
              Get Started Free
              <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="group text-lg font-semibold"
            asChild
          >
            <a
              href="https://calendly.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Calendar className="mr-2 size-5" />
              Schedule a Demo
            </a>
          </Button>
        </div>

        <p className="text-muted-foreground/70 mt-6 text-sm">
          Setup in minutes • Cancel anytime • Free forever plan available
        </p>

        {/* Social Proof */}
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {[
            { value: "10k+", label: "Roles Managed" },
            { value: "500+", label: "Organizations" },
            { value: "50k+", label: "Metrics Tracked" },
          ].map((stat, index) => (
            <div key={index}>
              <div className="text-primary mb-2 text-3xl font-bold">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
