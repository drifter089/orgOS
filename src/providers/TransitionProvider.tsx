"use client";

import { useRef } from "react";

import { gsap } from "gsap";
import { TransitionRouter } from "next-transition-router";

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const firstLayer = useRef<HTMLDivElement | null>(null);
  const secondLayer = useRef<HTMLDivElement | null>(null);

  return (
    <TransitionRouter
      auto={true}
      leave={(next, _from, _to) => {
        const tl = gsap
          .timeline({
            onComplete: next,
          })
          .fromTo(
            firstLayer.current,
            { x: "-100%", opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.4,
              ease: "power2.inOut",
            },
          )
          .fromTo(
            secondLayer.current,
            {
              x: "-100%",
              opacity: 0,
            },
            {
              x: 0,
              opacity: 1,
              duration: 0.4,
              ease: "power2.inOut",
            },
            "<40%",
          );

        return () => {
          tl.kill();
        };
      }}
      enter={(next) => {
        const tl = gsap
          .timeline()
          .fromTo(
            secondLayer.current,
            { x: 0, opacity: 1 },
            {
              x: "100%",
              opacity: 0,
              duration: 0.4,
              ease: "power2.inOut",
            },
          )
          .fromTo(
            firstLayer.current,
            { x: 0, opacity: 1 },
            {
              x: "100%",
              opacity: 0,
              duration: 0.4,
              ease: "power2.inOut",
            },
            "<40%",
          )
          .call(next, undefined, "<40%");

        return () => {
          tl.kill();
        };
      }}
    >
      <main>{children}</main>

      <div
        ref={firstLayer}
        className="bg-primary/80 fixed inset-0 z-999 -translate-x-full backdrop-blur-xl"
      />
      <div
        ref={secondLayer}
        className="bg-accent/90 fixed inset-0 z-999 -translate-x-full backdrop-blur-2xl"
      />
    </TransitionRouter>
  );
}
