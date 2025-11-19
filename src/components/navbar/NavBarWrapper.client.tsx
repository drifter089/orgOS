"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import dynamic from "next/dynamic";

import gsap from "gsap";

import { cn } from "@/lib/utils";

// Dynamic import for Three.js component to avoid SSR issues
const NavRobotIndicator = dynamic(
  () =>
    import("./NavRobotIndicator.client").then((mod) => mod.NavRobotIndicator),
  { ssr: false },
);

interface NavBarWrapperProps {
  children: ReactNode;
}

export function NavBarWrapper({ children }: NavBarWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isHoveringNavRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!navRef.current) return;

    const tl = gsap.timeline({ paused: true });

    tl.fromTo(
      navRef.current,
      {
        y: "-100%",
        rotateX: 15,
        opacity: 0,
        transformOrigin: "top center",
      },
      {
        y: "0%",
        rotateX: 0,
        opacity: 1,
        duration: 0.4,
        ease: "steps(8)",
      },
    )
      .to(navRef.current, {
        y: "2%",
        duration: 0.05,
        ease: "power2.in",
      })
      .to(navRef.current, {
        y: "0%",
        duration: 0.08,
        ease: "power2.out",
      })
      .fromTo(
        navRef.current,
        { scaleX: 0.98 },
        {
          scaleX: 1,
          duration: 0.1,
          ease: "power2.out",
        },
        "-=0.1",
      );

    timelineRef.current = tl;

    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    if (!timelineRef.current) return;

    if (isVisible) {
      timelineRef.current.play();
    } else {
      timelineRef.current.reverse();
    }
  }, [isVisible]);

  const scheduleHide = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringNavRef.current) {
        setIsVisible(false);
      }
    }, 1500);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(true);
      scheduleHide();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [scheduleHide]);

  const handleIndicatorHover = () => {
    if (!isMobile) {
      isHoveringNavRef.current = true;
      setIsVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    }
  };

  const handleIndicatorLeave = () => {
    if (!isMobile) {
      isHoveringNavRef.current = false;
      scheduleHide();
    }
  };

  const handleIndicatorClick = () => {
    if (isMobile) {
      setIsVisible(!isVisible);
      if (!isVisible && hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    }
  };

  const handleNavMouseEnter = () => {
    isHoveringNavRef.current = true;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handleNavMouseLeave = () => {
    isHoveringNavRef.current = false;
    scheduleHide();
  };

  return (
    <>
      <NavRobotIndicator
        isOpen={isVisible}
        onHover={handleIndicatorHover}
        onLeave={handleIndicatorLeave}
        onClick={handleIndicatorClick}
      />

      <div
        ref={navRef}
        className={cn(
          "fixed top-0 z-50 w-full",
          "border-border bg-background/95 supports-backdrop-filter:bg-background/80 border-b shadow-sm backdrop-blur-md",
          !isVisible && "pointer-events-none",
        )}
        style={{
          transform: "translateY(-100%)",
          opacity: 0,
          perspective: "1000px",
        }}
        onMouseEnter={handleNavMouseEnter}
        onMouseLeave={handleNavMouseLeave}
      >
        {children}
      </div>
    </>
  );
}
