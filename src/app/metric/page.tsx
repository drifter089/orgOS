"use client";

import { useEffect, useRef, useState } from "react";

import Nango from "@nangohq/frontend";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";

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
import { api } from "@/trpc/react";

export default function MetricPage() {
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: integrations, refetch: refetchIntegrations } =
    api.integration.list.useQuery();
  const { data: stats } = api.integration.stats.useQuery();

  // Revoke mutation
  const revokeMutation = api.integration.revoke.useMutation({
    onSuccess: () => {
      void refetchIntegrations();
      setStatus("Integration revoked successfully");
    },
    onError: (error) => {
      setStatus(`Error revoking integration: ${error.message}`);
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
          result.data?.some(
            (integration) => integration.connectionId === connectionId,
          )
        ) {
          setStatus("✓ Integration connected successfully!");
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
      setStatus("Fetching session token...");

      // Step 1: Get session token from backend
      const response = await fetch("/api/nango/session", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to get session token");
      }

      const data = (await response.json()) as { sessionToken: string };
      setStatus("Opening Nango Connect UI...");

      const nango = new Nango({ connectSessionToken: data.sessionToken });
      nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === "connect") {
            setStatus(
              `✓ Connected! Integration: ${event.payload.providerConfigKey} - Waiting for webhook...`,
            );
            void pollForIntegration(event.payload.connectionId);
          } else if (event.type === "close") {
            setStatus("Connection flow closed");
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
    if (confirm("Are you sure you want to revoke this integration?")) {
      revokeMutation.mutate({ connectionId });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8">
      {/* Header Card */}
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

      {/* Stats Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Integration Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Revoked</p>
                <p className="text-2xl font-bold text-gray-500">
                  {stats.revoked}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                      <Badge
                        variant={
                          integration.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {integration.status === "active" ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {integration.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Connected{" "}
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </p>
                    {integration.lastSyncAt && (
                      <p className="text-muted-foreground text-xs">
                        Last sync:{" "}
                        {new Date(integration.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                    {integration.errorMessage && (
                      <p className="text-xs text-red-600">
                        Error: {integration.errorMessage}
                      </p>
                    )}
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
    </div>
  );
}
