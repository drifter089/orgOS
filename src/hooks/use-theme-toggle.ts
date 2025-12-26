"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTheme } from "next-themes";
import { flushSync } from "react-dom";

interface UseThemeToggleOptions {
  duration?: number;
}

export function useThemeToggle(options?: UseThemeToggleOptions) {
  const { setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const duration = options?.duration ?? 500;

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const toggleTheme = useCallback(async () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";

    // Check for View Transitions API support and reduced motion preference
    if (
      !buttonRef.current ||
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(newTheme);
      setIsDark(newTheme === "dark");
      return;
    }

    // Get button position for circle origin
    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;

    // Calculate max radius to cover entire screen
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    // Start the view transition with flushSync to ensure DOM updates synchronously
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
        setIsDark(newTheme === "dark");
      });
    });

    // Wait for transition to be ready, then animate
    await transition.ready;

    // Animate the new view with a circular clip-path reveal
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  }, [resolvedTheme, setTheme, duration]);

  return { isDark, toggleTheme, buttonRef };
}
