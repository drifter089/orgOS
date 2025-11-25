"use client";

import { useEffect, useRef, useState } from "react";

import Nango from "@nangohq/frontend";
import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

interface AddPlatformButtonProps {
  onConnectionSuccess?: () => void;
}

export function AddPlatformButton({
  onConnectionSuccess,
}: AddPlatformButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { refetch: refetchIntegrations } =
    api.integration.listWithStats.useQuery();

  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const pollForIntegration = async (
    connectionId: string,
    maxAttempts = 10,
    interval = 1000,
  ) => {
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        attempts++;
        const result = await refetchIntegrations();

        if (
          result.data?.active.some(
            (integration) => integration.connectionId === connectionId,
          )
        ) {
          setStatus("Integration connected successfully!");
          setIsLoading(false);
          onConnectionSuccess?.();
          return;
        }

        if (attempts >= maxAttempts) {
          setStatus(
            "Integration may be delayed. Please refresh to see your connection.",
          );
          setIsLoading(false);
          return;
        }

        pollingTimeoutRef.current = setTimeout(() => {
          void poll();
        }, interval);
      } catch (error) {
        console.error("Error polling:", error);
        setStatus("Integration saved. Please refresh to see your connection.");
        setIsLoading(false);
      }
    };

    await poll();
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setStatus("");

      const response = await fetch("/api/nango/session", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to get session token");
      }

      const data = (await response.json()) as { sessionToken: string };

      const nango = new Nango({ connectSessionToken: data.sessionToken });
      nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === "connect") {
            void pollForIntegration(event.payload.connectionId);
          } else if (event.type === "close") {
            setIsLoading(false);
          }
        },
      });
    } catch (error) {
      console.error("Connection error:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={handleConnect} disabled={isLoading}>
        <Plus className="mr-2 h-4 w-4" />
        {isLoading ? "Connecting..." : "Platform"}
      </Button>

      {status && (
        <Alert className="mt-4">
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
