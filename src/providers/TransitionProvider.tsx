"use client";

import { useRef } from "react";

import { gsap } from "gsap";
import { TransitionRouter } from "next-transition-router";

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const transitionLayer = useRef<HTMLDivElement | null>(null);
  const loadingText = useRef<HTMLDivElement | null>(null);

  return (
    <TransitionRouter
      auto={true}
      leave={(next, _from, _to) => {
        const tl = gsap
          .timeline({
            onComplete: next,
          })
          .fromTo(
            transitionLayer.current,
            {
              clipPath: "circle(0% at 50% 50%)",
            },
            {
              clipPath: "circle(150% at 50% 50%)",
              duration: 0.5,
              ease: "power4.inOut",
            },
          )
          .fromTo(
            loadingText.current,
            {
              opacity: 0,
              scale: 0.8,
            },
            {
              opacity: 1,
              scale: 1,
              duration: 0.3,
              ease: "power2.out",
            },
            "<0.2",
          );

        return () => {
          tl.kill();
        };
      }}
      enter={(next) => {
        const tl = gsap
          .timeline()
          .to(loadingText.current, {
            opacity: 0,
            scale: 0.8,
            duration: 0.2,
            ease: "power2.in",
          })
          .to(
            transitionLayer.current,
            {
              clipPath: "circle(0% at 50% 50%)",
              duration: 0.5,
              ease: "power4.inOut",
            },
            "<",
          )
          .call(next, undefined, "<0.25");

        return () => {
          tl.kill();
        };
      }}
    >
      <main>{children}</main>

      <div
        ref={transitionLayer}
        className="from-background via-muted to-background fixed inset-0 z-999 bg-gradient-to-br"
        style={{ clipPath: "circle(0% at 50% 50%)" }}
      >
        <div
          ref={loadingText}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0"
        >
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-foreground font-mono text-4xl font-bold tracking-tighter">
              ORG-OS
            </h1>
            <div className="flex gap-1">
              <div className="bg-foreground size-2 animate-pulse rounded-full delay-0" />
              <div className="bg-foreground size-2 animate-pulse rounded-full delay-150" />
              <div className="bg-foreground size-2 animate-pulse rounded-full delay-300" />
            </div>
          </div>
        </div>
      </div>
    </TransitionRouter>
  );
}
