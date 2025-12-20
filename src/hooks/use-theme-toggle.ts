"use client";

import { useCallback, useEffect, useState } from "react";

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
  blur?: boolean;
  gifUrl?: string;
}

/**
 * Simple theme toggle hook that provides isDark state and toggleTheme function.
 * Options are accepted for API compatibility but animations are simplified.
 */
export function useThemeToggle(_options?: UseThemeToggleOptions) {
  const { setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  // Sync isDark state with resolved theme after hydration
  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  }, [resolvedTheme, setTheme]);

  return { isDark, toggleTheme };
}
