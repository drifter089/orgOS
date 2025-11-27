"use client";

import { useMemo, useRef } from "react";

import { gsap } from "gsap";
import { TransitionRouter } from "next-transition-router";

const GRID_COLS = 8;
const GRID_ROWS = 6;

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const loadingText = useRef<HTMLDivElement | null>(null);

  const gridCells = useMemo(
    () =>
      Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => ({
        id: i,
        col: i % GRID_COLS,
        row: Math.floor(i / GRID_COLS),
      })),
    [],
  );

  return (
    <TransitionRouter
      auto={true}
      leave={(next, _from, _to) => {
        const cells = gridRef.current?.querySelectorAll(".grid-cell");
        if (!cells) {
          next();
          return;
        }

        const tl = gsap
          .timeline({
            onComplete: next,
          })
          .set(gridRef.current, { visibility: "visible" })
          .fromTo(
            cells,
            {
              scaleY: 0,
              opacity: 0,
            },
            {
              scaleY: 1,
              opacity: 1,
              duration: 0.25,
              ease: "power4.out",
              stagger: {
                amount: 0.1,
                grid: [GRID_ROWS, GRID_COLS],
                from: "start",
              },
            },
          )
          .fromTo(
            loadingText.current,
            {
              opacity: 0,
              y: 10,
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.15,
              ease: "power2.out",
            },
            "-=0.1",
          );

        return () => {
          tl.kill();
        };
      }}
      enter={(next) => {
        const cells = gridRef.current?.querySelectorAll(".grid-cell");
        if (!cells) {
          next();
          return;
        }

        const tl = gsap
          .timeline()
          .to(loadingText.current, {
            opacity: 0,
            y: -10,
            duration: 0.1,
            ease: "power2.in",
          })
          .to(
            cells,
            {
              scaleY: 0,
              opacity: 0,
              duration: 0.25,
              ease: "power4.in",
              stagger: {
                amount: 0.1,
                grid: [GRID_ROWS, GRID_COLS],
                from: "end",
              },
            },
            "-=0.05",
          )
          .call(next, undefined, "-=0.15")
          .set(gridRef.current, { visibility: "hidden" });

        return () => {
          tl.kill();
        };
      }}
    >
      <main>{children}</main>

      <div
        ref={gridRef}
        className="pointer-events-none fixed inset-0 z-999"
        style={{ visibility: "hidden" }}
      >
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gap: 0,
          }}
        >
          {gridCells.map((cell) => (
            <div
              key={cell.id}
              className="grid-cell bg-muted border-muted-foreground/5 origin-top border"
              style={{
                transform: "scaleY(0)",
                opacity: 0,
                margin: "-0.5px",
                padding: "0.5px",
              }}
            />
          ))}
        </div>

        <div
          ref={loadingText}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0"
        >
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-foreground font-mono text-4xl font-bold tracking-tighter">
              ORG-OS
            </h1>
            <div className="grid grid-cols-3 gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-foreground/80 size-2"
                  style={{
                    animation: `gridPulse 0.8s ease-in-out infinite`,
                    animationDelay: `${(i % 3) * 0.1 + Math.floor(i / 3) * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gridPulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </TransitionRouter>
  );
}
