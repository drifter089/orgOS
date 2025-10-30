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
            { x: "-100%" },
            {
              x: 0,
              duration: 0.5,
              ease: "circ.inOut",
            },
          )
          .fromTo(
            secondLayer.current,
            {
              x: "-100%",
            },
            {
              x: 0,
              duration: 0.5,
              ease: "circ.inOut",
            },
            "<50%",
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
            { x: 0 },
            {
              x: "100%",
              duration: 0.5,
              ease: "circ.inOut",
            },
          )
          .fromTo(
            firstLayer.current,
            { x: 0 },
            {
              x: "100%",
              duration: 0.5,
              ease: "circ.inOut",
            },
            "<50%",
          )
          .call(next, undefined, "<50%");

        return () => {
          tl.kill();
        };
      }}
    >
      <main>{children}</main>

      <div
        ref={firstLayer}
        className="bg-card fixed inset-0 z-999 -translate-x-full"
      />
      <div
        ref={secondLayer}
        className="bg-card fixed inset-0 z-999 -translate-x-full"
      />
    </TransitionRouter>
  );
}
