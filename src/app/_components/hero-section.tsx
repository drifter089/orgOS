"use client";

import { useRef } from "react";

import Link from "next/link";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { Button } from "@/components/ui/button";

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(headlineRef.current, {
        y: 100,
        opacity: 0,
        duration: 1.2,
        delay: 0.2,
      })
        .from(
          subtitleRef.current,
          {
            y: 50,
            opacity: 0,
            duration: 0.8,
          },
          "-=0.6",
        )
        .from(
          ctaRef.current,
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
          },
          "-=0.4",
        );
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-24"
    >
      {/* Gradient background with blur orbs */}
      <div className="absolute inset-0">
        <div className="bg-primary/40 absolute top-0 left-0 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div className="bg-secondary/40 absolute top-1/3 right-0 h-[600px] w-[600px] rounded-full blur-[120px]" />
        <div className="bg-accent/30 absolute bottom-0 left-1/3 h-[550px] w-[550px] rounded-full blur-[120px]" />
        <div className="bg-destructive/20 absolute top-1/2 right-1/3 h-[450px] w-[450px] rounded-full blur-[120px]" />
        <div className="bg-background/40 absolute inset-0 backdrop-blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl text-center">
        <h1
          ref={headlineRef}
          className="from-foreground via-foreground/90 to-foreground/70 bg-gradient-to-br bg-clip-text pb-2 text-5xl leading-[0.95] font-black tracking-tighter text-transparent sm:text-7xl md:text-8xl lg:text-9xl"
        >
          Visualize Your Organization
        </h1>

        <p
          ref={subtitleRef}
          className="text-muted-foreground mx-auto mt-8 max-w-3xl text-lg font-medium sm:text-xl md:text-2xl"
        >
          Role-based charts meet real-time KPIs. Build clarity and agility into
          every level of your organization.
        </p>

        <div
          ref={ctaRef}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button size="lg" className="text-lg font-semibold" asChild>
            <Link href="/api/auth/login">Get Started Free</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg font-semibold"
            asChild
          >
            <Link href="#demo">Schedule a Demo</Link>
          </Button>
        </div>

        <p className="text-muted-foreground/70 mt-6 text-sm">
          No credit card required • Setup in minutes
        </p>
      </div>
    </section>
  );
}
