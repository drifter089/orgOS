"use client";

import { useEffect, useRef, useState } from "react";

import Nango from "@nangohq/frontend";
import { CheckCircle2, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

// Infer types from tRPC router
type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface IntegrationClientProps {
  initialData: IntegrationsWithStats;
}

export function IntegrationClient({ initialData }: IntegrationClientProps) {
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { confirm } = useConfirmation();
  const utils = api.useUtils();

  // Use initialData for instant page load
  const { data, refetch: refetchIntegrations } =
    api.integration.listWithStats.useQuery(undefined, {
      initialData,
    });

  const integrations = data?.active;

  const revokeMutation = api.integration.revoke.useMutation({
    onMutate: async ({ connectionId }) => {
      await utils.integration.listWithStats.cancel();
      const previousData = utils.integration.listWithStats.getData();

      // Optimistically remove integration (will be hard deleted from DB and Nango)
      if (previousData) {
        const newActive = previousData.active.filter(
          (i) => i.connectionId !== connectionId,
        );
        utils.integration.listWithStats.setData(undefined, {
          active: newActive,
          stats: {
            ...previousData.stats,
            total: newActive.length,
            active: newActive.length,
          },
        });

        return { previousData };
      }

      return { previousData };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        utils.integration.listWithStats.setData(
          undefined,
          context.previousData,
        );
      }
      setStatus(`Error deleting integration: ${error.message}`);
    },
    onSuccess: () => {
      setStatus("Integration deleted successfully");
    },
    onSettled: async () => {
      await utils.integration.listWithStats.invalidate();
    },
  });

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
          return;
        }

        if (attempts >= maxAttempts) {
          setStatus(
            "Integration webhook may be delayed. Please refresh the page to see your connection.",
          );
          setIsLoading(false);
          return;
        }

        pollingTimeoutRef.current = setTimeout(() => {
          void poll();
        }, interval);
      } catch (error) {
        console.error("Error polling for integration:", error);
        setStatus(
          "Integration saved, but there was an error loading the list. Please refresh the page.",
        );
        setIsLoading(false);
      }
    };

    await poll();
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setStatus("");

      const response = await fetch("/api/nango/session", {
        method: "POST",
      });

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

  const handleRevoke = async (connectionId: string) => {
    const confirmed = await confirm({
      title: "Delete integration",
      description:
        "Are you sure you want to delete this integration? This will permanently remove the connection and any metrics using this integration will stop receiving updates.",
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      revokeMutation.mutate({ connectionId });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Connect 3rd Party Services</CardTitle>
          <CardDescription>
            Manage your organization&apos;s integrations with external APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleConnect} disabled={isLoading} size="lg">
            {isLoading ? "Connecting..." : "Connect New Integration"}
          </Button>

          {status && (
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Connected Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Integrations</CardTitle>
          <CardDescription>
            {integrations?.length
              ? `${integrations.length} active integration${integrations.length > 1 ? "s" : ""}`
              : "No integrations connected yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations && integrations.length > 0 ? (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold capitalize">
                        {integration.integrationId}
                      </h3>
                      <Badge variant="default">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Connected{" "}
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(integration.connectionId)}
                    disabled={revokeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground space-y-2 text-sm">
              <p>Before connecting:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Configure an integration in your Nango dashboard</li>
                <li>Set up OAuth credentials with the provider</li>
                <li>Test the connection in Nango&apos;s Connections tab</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
