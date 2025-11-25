"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    id: 1,
    name: "Real-Time Collaboration",
    desc: "Work together seamlessly. Changes sync instantly across your entire team, keeping everyone aligned.",
    icon: "👥",
  },
  {
    id: 2,
    name: "Visual Canvas",
    desc: "Drag-and-drop interface makes org design intuitive. Create clarity through visual structure.",
    icon: "🎨",
  },
  {
    id: 3,
    name: "Smart Analytics",
    desc: "Track metrics that matter. Data-driven insights help you make informed decisions about your organization.",
    icon: "📊",
  },
  {
    id: 4,
    name: "Role Clarity",
    desc: "Define purpose and accountabilities for every role. No more confusion about who does what.",
    icon: "🎯",
  },
  {
    id: 5,
    name: "Scalable Structure",
    desc: "From 10 to 10,000 people. Your organization grows without losing clarity or becoming complex.",
    icon: "📈",
  },
  {
    id: 6,
    name: "Flexible Workflows",
    desc: "Adapt quickly to change. Reorganize in minutes, not months, as your business evolves.",
    icon: "⚡",
  },
];

export function FeaturesProductCarousel() {
  const [isActive, setIsActive] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  // Listen to carousel slide changes
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      const currentIndex = api.selectedScrollSnap();
      setIsActive(currentIndex);
    };

    api.on("select", onSelect);
    onSelect(); // Set initial state

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const currentFeature = FEATURES[isActive];

  return (
    <MotionConfig
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 30,
      }}
    >
      <section className="bg-background text-foreground flex w-full items-center justify-center px-4 py-24">
        <div className="w-full max-w-[90rem]">
          <div className="mb-16 text-center">
            <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Why Teams Choose Org OS
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              Built for modern organizations that value clarity, agility, and
              growth
            </p>
          </div>

          <div className="bg-card border-border relative flex min-h-[745px] w-full flex-col justify-end overflow-hidden rounded-4xl border pb-5 shadow-2xl">
            {/* Carousel Navigation */}
            <div className="relative z-10 flex w-full">
              <Carousel className="w-full" setApi={setApi}>
                <CarouselContent className="-ml-1 flex items-end">
                  {FEATURES.map((feature, index) => (
                    <CarouselItem
                      key={index}
                      className="w-full basis-[85%] pl-2 first:ml-10 last:mr-10"
                    >
                      <motion.div
                        layout
                        transition={{
                          type: "spring",
                          duration: 0.7,
                          bounce: 0.3,
                        }}
                        style={{
                          borderRadius: "25px",
                        }}
                        className={cn(
                          "hover:bg-foreground/14 bg-foreground/10 flex h-fit w-full items-center justify-center backdrop-blur-sm",
                        )}
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
                            className="p-6 text-lg"
                          >
                            <div>
                              <div className="mb-2 text-3xl">
                                {feature.icon}
                              </div>
                              <b className="capitalize">{feature.name}.</b>
                              <span> {feature.desc}</span>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="btn"
                            initial={{ opacity: 0, filter: "blur(2px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, filter: "blur(2px)" }}
                            transition={{ duration: 0.3, delay: 0.25 }}
                            onClick={() => api?.scrollTo(index)}
                            className={cn(
                              "flex h-[56px] w-full cursor-pointer items-center justify-start gap-[14px] rounded-full",
                              index > isActive
                                ? "justify-start pl-3"
                                : "justify-end pr-3",
                            )}
                          >
                            {index > isActive ? (
                              <ChevronRight />
                            ) : (
                              <ChevronLeft />
                            )}
                          </motion.button>
                        )}
                      </motion.div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>

            {/* Feature Display */}
            <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2">
              <AnimatePresence mode="popLayout">
                {currentFeature && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      x: "15%",
                      scale: 0.9,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      scale: 1,
                      transition: {
                        delay: 0.2,
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    exit={{
                      opacity: 0,
                      x: "-15%",
                      scale: 0.9,
                    }}
                    key={isActive}
                    className="flex h-full w-full items-center justify-center"
                  >
                    <div className="text-foreground flex flex-col items-center justify-center text-center">
                      <div className="mb-8 text-9xl">{currentFeature.icon}</div>
                      <h3 className="mb-4 text-4xl font-bold">
                        {currentFeature.name}
                      </h3>
                      <p className="text-muted-foreground max-w-2xl text-xl">
                        {currentFeature.desc}
                      </p>
                    </div>
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
