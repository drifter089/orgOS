"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTheme } from "next-themes";

type AnimationStart =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface UseThemeToggleOptions {
  start?: AnimationStart;
}

const STYLE_ID = "theme-transition-styles";

function getClipPathPosition(position: AnimationStart) {
  switch (position) {
    case "top-left":
      return "0% 0%";
    case "top-right":
      return "100% 0%";
    case "bottom-left":
      return "0% 100%";
    case "bottom-right":
      return "100% 100%";
    case "center":
    default:
      return "50% 50%";
  }
}

function createAnimationCSS(
  start: AnimationStart,
  buttonRef: React.RefObject<HTMLButtonElement | null>,
) {
  let clipPosition = getClipPathPosition(start);

  // If we have a button ref, calculate position from button
  if (buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    clipPosition = `${x}% ${y}%`;
  }

  return `
    ::view-transition-group(root) {
      animation-duration: 0.7s;
      animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
    }

    ::view-transition-new(root) {
      animation-name: reveal-light;
    }

    ::view-transition-old(root),
    .dark::view-transition-old(root) {
      animation: none;
      z-index: -1;
    }

    .dark::view-transition-new(root) {
      animation-name: reveal-dark;
    }

    @keyframes reveal-dark {
      from {
        clip-path: circle(0% at ${clipPosition});
      }
      to {
        clip-path: circle(150% at ${clipPosition});
      }
    }

    @keyframes reveal-light {
      from {
        clip-path: circle(0% at ${clipPosition});
      }
      to {
        clip-path: circle(150% at ${clipPosition});
      }
    }
  `;
}

function updateStyles(css: string) {
  if (typeof window === "undefined") return;

  let styleElement = document.getElementById(STYLE_ID) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = STYLE_ID;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = css;
}

export function useThemeToggle(options?: UseThemeToggleOptions) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const start = options?.start ?? "top-right";

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";

    // Update local state immediately
    setIsDark(newTheme === "dark");

    // Generate and inject animation CSS
    const css = createAnimationCSS(start, buttonRef);
    updateStyles(css);

    // Check if View Transitions API is supported
    if (typeof window === "undefined") return;

    const switchTheme = () => {
      setTheme(newTheme);
    };

    if (!document.startViewTransition) {
      switchTheme();
      return;
    }

    document.startViewTransition(switchTheme);
  }, [theme, setTheme, start]);

  return { isDark, toggleTheme, buttonRef };
}
