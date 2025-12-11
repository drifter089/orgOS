"use client";

import { useEffect, useRef } from "react";

import { api } from "@/trpc/react";

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

/**
 * Hook to manage edit session for multi-user blocking.
 * - Acquires session on mount
 * - Sends heartbeat every 30 seconds to keep session alive
 * - Releases session on unmount (for normal navigation)
 * - For browser crash/close, server-side timeout (60s) handles cleanup
 */
export function useEditSession(teamId: string) {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const acquire = api.editSession.acquire.useMutation();
  const heartbeat = api.editSession.heartbeat.useMutation();
  const release = api.editSession.release.useMutation();

  useEffect(() => {
    // Acquire session on mount
    acquire.mutate({ teamId });

    // Start heartbeat to keep session alive
    heartbeatIntervalRef.current = setInterval(() => {
      heartbeat.mutate({ teamId });
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup: release session on unmount (handles normal navigation)
    // For browser crash/close, server-side 60s timeout handles cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      release.mutate({ teamId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);
}
