"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

interface NavBarWrapperProps {
  children: ReactNode;
}

export function NavBarWrapper({ children }: NavBarWrapperProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isHoveringNavRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to schedule auto-hide using ref for hover state
  const scheduleHide = useCallback(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Schedule hide after 1 second if not hovering
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringNavRef.current) {
        setIsVisible(false);
      }
    }, 1000);
  }, []);

  // Function to show navbar and schedule hide
  const showAndScheduleHide = useCallback(() => {
    setIsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    // Auto-hide on initial mount after 1 second
    scheduleHide();

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show navbar when scrolling (any direction)
      setIsVisible(true);

      // Schedule hide after scroll stops
      scheduleHide();

      setLastScrollY(currentScrollY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Show navbar when mouse is near the top (within 100px)
      if (e.clientY < 100) {
        showAndScheduleHide();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [scheduleHide, showAndScheduleHide]);

  const handleMouseEnter = () => {
    isHoveringNavRef.current = true;
    setIsVisible(true);
    // Clear hide timeout when hovering
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    isHoveringNavRef.current = false;
    // Schedule hide when mouse leaves
    scheduleHide();
  };

  return (
    <div
      className={cn(
        "fixed top-0 z-50 w-full transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "-translate-y-full",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
