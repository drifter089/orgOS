"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  CollaborationDemo,
  MetricsTrackingDemo,
  MiniChartDemo,
  MiniRoleCanvas,
  VisualOrgStructure,
} from "./feature-demos";

const FEATURES = [
  {
    id: 1,
    name: "Visual Role Canvas",
    desc: "Drag-and-drop your entire org structure. See relationships, hierarchies, and connections in real-time.",
    component: MiniRoleCanvas,
  },
  {
    id: 2,
    name: "Real-Time Analytics",
    desc: "Track KPIs that matter. Visualize performance across teams with live charts and metrics.",
    component: MiniChartDemo,
  },
  {
    id: 3,
    name: "Smart Metrics",
    desc: "Set targets, track progress, and get instant insights. Watch your organization grow with data-driven decisions.",
    component: MetricsTrackingDemo,
  },
  {
    id: 4,
    name: "Team Collaboration",
    desc: "Real-time updates, activity feeds, and seamless communication. Everyone stays in sync.",
    component: CollaborationDemo,
  },
  {
    id: 5,
    name: "Organization Insights",
    desc: "Complete visibility into your org structure. From leadership to individual contributors.",
    component: VisualOrgStructure,
  },
];

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
};

export function FeaturesCarouselV2() {
  const [isActive, setIsActive] = useState<number | null>(0);
  const isMobile = useIsMobile();

  return (
    <MotionConfig transition={{ type: "spring", stiffness: 200, damping: 30 }}>
      <section className="bg-background relative flex w-full items-center justify-center px-4 py-24">
        {/* Subtle background gradient for smooth transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-transparent opacity-50" />

        <div className="relative z-10 w-full max-w-[90rem]">
          <div className="mb-16 text-center">
            <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Everything You Need to Scale
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              Interactive tools designed to bring clarity and structure to your
              organization
            </p>
          </div>

          <div className="bg-card border-border relative flex min-h-[745px] w-full flex-col justify-end overflow-hidden rounded-4xl border pb-5 shadow-2xl md:justify-center">
            <div className="relative flex items-center md:px-10 lg:px-24">
              <AnimatePresence>
                {isActive !== null && !isMobile && (
                  <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    className="absolute left-8 hidden flex-col gap-2 lg:flex"
                  >
                    <button
                      onClick={() => {
                        if (isActive > 0) {
                          setIsActive(isActive - 1);
                        }
                      }}
                      disabled={isActive === 0}
                      className={cn(
                        "bg-foreground/10 top-5 z-3 flex size-10 items-center justify-center rounded-full backdrop-blur-sm active:scale-95",
                        isActive === 0
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                      )}
                    >
                      <ChevronUp className="size-6 stroke-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (isActive < FEATURES.length - 1) {
                          setIsActive(isActive + 1);
                        }
                      }}
                      disabled={isActive === FEATURES.length - 1}
                      className={cn(
                        "bg-foreground/10 top-5 z-3 flex size-10 items-center justify-center rounded-full backdrop-blur-sm transition-all ease-out active:scale-95",
                        isActive === FEATURES.length - 1
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                      )}
                    >
                      <ChevronDown className="size-6 stroke-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Desktop */}
              <ul className="relative z-1 hidden flex-col justify-center gap-3 md:flex">
                {FEATURES.map((feature, index) => (
                  <motion.li
                    key={index}
                    layout
                    transition={{
                      type: "spring",
                      duration: 0.7,
                      bounce: 0.3,
                    }}
                    style={{ borderRadius: "25px" }}
                    className="bg-foreground/10 hover:bg-foreground/20 flex h-fit w-fit items-center justify-center backdrop-blur-sm"
                  >
                    {isActive === index ? (
                      <motion.div
                        key="name"
                        initial={{ opacity: 0, filter: "blur(2px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        transition={{
                          duration: 0.5,
                          delay: 0.25,
                        }}
                        className="max-w-[26.5rem] p-6 text-lg"
                      >
                        <div>
                          <b className="text-xl">{feature.name}.</b>
                          <p className="text-foreground/80 mt-2">
                            {feature.desc}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="btn"
                        initial={{ opacity: 0, filter: "blur(2px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, filter: "blur(2px)" }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                        onClick={() => setIsActive(index)}
                        className="flex h-[56px] cursor-pointer items-center justify-center gap-[14px] rounded-full px-8"
                      >
                        <span className="text-lg font-semibold whitespace-nowrap">
                          {feature.name}
                        </span>
                      </motion.button>
                    )}
                  </motion.li>
                ))}
              </ul>

              {/* Mobile */}
              {isMobile && (
                <div className="relative z-10 flex w-full lg:hidden">
                  <MobileCarousel
                    isActive={isActive}
                    setIsActive={setIsActive}
                  />
                </div>
              )}
            </div>

            {/* Feature Demo Display */}
            <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 md:left-[70%] md:w-[85%]">
              <AnimatePresence mode="popLayout">
                {isActive !== null && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                      x: "10%",
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: 0,
                      transition: {
                        delay: 0.2,
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      x: "-10%",
                    }}
                    key={isActive}
                    className="flex h-full w-full items-center justify-center"
                  >
                    {(() => {
                      const feature = FEATURES[isActive];
                      if (!feature) return null;
                      const Component = feature.component;
                      return <Component />;
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}

function MobileCarousel({
  isActive,
  setIsActive,
}: {
  isActive: number | null;
  setIsActive: (index: number | null) => void;
}) {
  return (
    <div className="no-scroll flex w-full gap-3 overflow-x-auto px-5">
      {FEATURES.map((feature, index) => (
        <motion.div
          key={index}
          layout
          transition={{ type: "spring", duration: 0.7, bounce: 0.3 }}
          style={{ borderRadius: "25px" }}
          className="bg-foreground/10 flex h-fit min-w-[85%] items-center justify-center backdrop-blur-sm"
        >
          {isActive === index ? (
            <motion.div
              initial={{ opacity: 0, filter: "blur(2px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="p-6 text-lg"
            >
              <div>
                <b className="text-xl">{feature.name}.</b>
                <p className="text-foreground/80 mt-2">{feature.desc}</p>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0, filter: "blur(2px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(2px)" }}
              transition={{ duration: 0.3, delay: 0.25 }}
              onClick={() => setIsActive(index)}
              className={cn(
                "flex h-[56px] w-full cursor-pointer items-center gap-[14px] rounded-full",
                index > (isActive ?? -1)
                  ? "justify-start pl-3"
                  : "justify-end pr-3",
              )}
            >
              {index > (isActive ?? -1) ? <ChevronRight /> : <ChevronLeft />}
            </motion.button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
