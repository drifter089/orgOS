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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  // Sync isDark state with resolved theme after hydration
  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    setIsDark(!isDark);
    setTheme(theme === "light" ? "dark" : "light");
  }, [isDark, theme, setTheme]);

  return { isDark, toggleTheme };
}
