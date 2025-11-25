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

const FEATURES = [
  {
    id: 1,
    name: "Visual Team Canvas",
    desc: "Drag-and-drop interface to visualize your entire organization structure. Create roles, define relationships, and see the big picture at a glance.",
    icon: "🎨",
  },
  {
    id: 2,
    name: "Role-Based Organization",
    desc: "Define clear roles with specific purposes and accountabilities. No more confusion about who does what.",
    icon: "🎯",
  },
  {
    id: 3,
    name: "Real-Time KPI Tracking",
    desc: "Track metrics that matter with built-in support for percentages, numbers, durations, and rates. See progress in real-time.",
    icon: "📊",
  },
  {
    id: 4,
    name: "Smart Metrics",
    desc: "Set targets, track current values, and get instant insights. Visualize performance across your entire organization.",
    icon: "📈",
  },
  {
    id: 5,
    name: "Team Collaboration",
    desc: "Assign team members to roles, track their responsibilities, and ensure everyone knows their contribution.",
    icon: "👥",
  },
  {
    id: 6,
    name: "Organization Insights",
    desc: "Multi-tenant architecture with WorkOS integration. Secure, scalable, and built for teams of all sizes.",
    icon: "🔒",
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

export function FeaturesCarousel() {
  const [isActive, setIsActive] = useState<number | null>(null);
  const isMobile = useIsMobile();

  return (
    <MotionConfig transition={{ type: "spring", stiffness: 200, damping: 30 }}>
      <section className="from-background to-muted flex w-full items-center justify-center bg-gradient-to-b px-4 py-24">
        <div className="w-full max-w-[90rem]">
          <div className="mb-16 text-center">
            <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Everything You Need to Scale
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              Powerful features designed to bring clarity and structure to your
              organization
            </p>
          </div>

          <div className="relative flex min-h-[745px] w-full flex-col justify-end overflow-hidden rounded-4xl bg-gradient-to-br from-gray-900 to-gray-800 pb-5 text-white shadow-2xl md:justify-center">
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
                        "top-5 z-3 flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:scale-95",
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
                        "top-5 z-3 flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all ease-out active:scale-95",
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
                    className="flex h-fit w-fit items-center justify-center bg-white/10 backdrop-blur-sm hover:bg-white/20"
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
                        <div className="flex items-start gap-3">
                          <span className="text-4xl">{feature.icon}</span>
                          <div>
                            <b className="text-xl">{feature.name}.</b>
                            <p className="mt-2 text-white/80">{feature.desc}</p>
                          </div>
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
                        className="flex h-[56px] cursor-pointer items-center justify-center gap-[14px] rounded-full pr-8 pl-[14px]"
                      >
                        <span className="text-2xl">{feature.icon}</span>
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

            {/* Feature Icon Display */}
            <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2">
              <AnimatePresence mode="popLayout">
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: {
                      delay: 0.2,
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    },
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  key={isActive ?? "default"}
                  className="flex h-full w-full items-center justify-center"
                >
                  <div className="text-[20rem] opacity-20">
                    {isActive !== null && FEATURES[isActive]
                      ? FEATURES[isActive].icon
                      : "🚀"}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {isActive !== null && (
                <motion.button
                  initial={{ y: "100%", opacity: 0, scale: 0 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: "100%", opacity: 0, scale: 0 }}
                  onClick={() => setIsActive(null)}
                  className="absolute top-5 right-5 z-30 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:scale-95"
                >
                  <ChevronLeft className="size-6 stroke-3" />
                </motion.button>
              )}
            </AnimatePresence>
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
          className="flex h-fit min-w-[85%] items-center justify-center bg-white/10 backdrop-blur-sm"
        >
          {isActive === index ? (
            <motion.div
              initial={{ opacity: 0, filter: "blur(2px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="p-6 text-lg"
            >
              <div className="flex items-start gap-3">
                <span className="text-4xl">{feature.icon}</span>
                <div>
                  <b className="text-xl">{feature.name}.</b>
                  <p className="mt-2 text-white/80">{feature.desc}</p>
                </div>
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
