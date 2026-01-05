"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

interface VersionCheckResult {
  hasNewVersion: boolean;
  currentVersion: string | null;
  latestVersion: string | null;
  hardRefresh: () => void;
}

/**
 * Hook to check for new application versions.
 *
 * Instead of constant polling, this hook checks for updates on:
 * 1. Initial page load
 * 2. Route navigation (when user clicks a link)
 * 3. Tab visibility change (when user returns to the tab)
 *
 * This is more efficient than polling every N seconds.
 */
export function useVersionCheck(): VersionCheckResult {
  const [initialVersion, setInitialVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const hasNotified = useRef(false);
  const pathname = usePathname();

  const fetchVersion = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/version", {
        cache: "no-store",
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { buildId: string };
      return data.buildId;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void fetchVersion().then((version) => {
      if (version) {
        setInitialVersion(version);
        setLatestVersion(version);
      }
    });
  }, [fetchVersion]);

  useEffect(() => {
    if (!initialVersion || initialVersion === "development") return;

    void fetchVersion().then((version) => {
      if (version && version !== "development") {
        setLatestVersion(version);
      }
    });
  }, [pathname, initialVersion, fetchVersion]);

  useEffect(() => {
    if (!initialVersion || initialVersion === "development") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchVersion().then((version) => {
          if (version && version !== "development") {
            setLatestVersion(version);
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialVersion, fetchVersion]);

  const hasNewVersion =
    initialVersion !== null &&
    latestVersion !== null &&
    initialVersion !== "development" &&
    latestVersion !== "development" &&
    initialVersion !== latestVersion &&
    !hasNotified.current;

  useEffect(() => {
    if (hasNewVersion) {
      hasNotified.current = true;
    }
  }, [hasNewVersion]);

  const hardRefresh = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  return {
    hasNewVersion,
    currentVersion: initialVersion,
    latestVersion,
    hardRefresh,
  };
}
