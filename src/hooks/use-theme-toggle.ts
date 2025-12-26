"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTheme } from "next-themes";

interface UseThemeToggleOptions {
  variant?: "circle" | "rectangle" | "gif" | "polygon" | "circle-blur";
  start?:
    | "center"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "bottom-up";
}

function getPosition(
  start: UseThemeToggleOptions["start"],
  buttonRef: React.RefObject<HTMLButtonElement | null>,
) {
  if (buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  switch (start) {
    case "top-left":
      return { x: 0, y: 0 };
    case "top-right":
      return { x: width, y: 0 };
    case "bottom-left":
      return { x: 0, y: height };
    case "bottom-right":
      return { x: width, y: height };
    case "left":
      return { x: 0, y: height / 2 };
    case "right":
      return { x: width, y: height / 2 };
    case "top":
      return { x: width / 2, y: 0 };
    case "bottom":
    case "bottom-up":
      return { x: width / 2, y: height };
    case "center":
    default:
      return { x: width / 2, y: height / 2 };
  }
}

export function useThemeToggle(options?: UseThemeToggleOptions) {
  const { setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const start = options?.start ?? "top-right";

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "light" ? "dark" : "light";

    // Check if View Transitions API is supported
    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      typeof document.startViewTransition === "function"
    ) {
      const { x, y } = getPosition(start, buttonRef);
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const transition = document.startViewTransition(() => {
        setTheme(newTheme);
      });

      transition.ready
        .then(() => {
          const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ];

          document.documentElement.animate(
            {
              clipPath: isDark ? clipPath : clipPath.reverse(),
            },
            {
              duration: 400,
              easing: "ease-out",
              pseudoElement: isDark
                ? "::view-transition-old(root)"
                : "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {
          // Animation failed, theme still changed
        });
    } else {
      setTheme(newTheme);
    }
  }, [resolvedTheme, setTheme, start, isDark]);

  return { isDark, toggleTheme, buttonRef };
}
