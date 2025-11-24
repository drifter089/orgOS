"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import Nango from "@nangohq/frontend";
import { CheckCircle2, FileSpreadsheet, Plus, Trash2 } from "lucide-react";

import { GitHubMetricDialog } from "@/app/metric/_components/GitHubMetricDialog";
import { GoogleSheetsMetricDialog } from "@/app/metric/_components/GoogleSheetsMetricDialog";
import { PostHogMetricDialog } from "@/app/metric/_components/PostHogMetricDialog";
import { YouTubeMetricDialog } from "@/app/metric/_components/YouTubeMetricDialog";
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

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface IntegrationClientProps {
  initialData: IntegrationsWithStats;
  gridCols?: 2 | 4; // Number of columns for the integration grid
  onMetricCreated?: () => void;
}

const getIntegrationLogo = (integrationId: string) => {
  const logoMap: Record<
    string,
    { url?: string; useLucide?: boolean; bgColor: string; textColor: string }
  > = {
    github: {
      url: "https://cdn.simpleicons.org/github/FFFFFF",
      bgColor: "bg-slate-900",
      textColor: "text-white",
    },
    gitlab: {
      url: "https://cdn.simpleicons.org/gitlab/FFFFFF",
      bgColor: "bg-orange-600",
      textColor: "text-white",
    },
    linear: {
      url: "https://cdn.simpleicons.org/linear/FFFFFF",
      bgColor: "bg-indigo-600",
      textColor: "text-white",
    },
    jira: {
      url: "https://cdn.simpleicons.org/jira/FFFFFF",
      bgColor: "bg-blue-600",
      textColor: "text-white",
    },
    notion: {
      url: "https://cdn.simpleicons.org/notion/FFFFFF",
      bgColor: "bg-black",
      textColor: "text-white",
    },
    slack: {
      url: "https://cdn.simpleicons.org/slack/FFFFFF",
      bgColor: "bg-purple-900",
      textColor: "text-white",
    },
    asana: {
      url: "https://cdn.simpleicons.org/asana/FFFFFF",
      bgColor: "bg-red-400",
      textColor: "text-white",
    },
    trello: {
      url: "https://cdn.simpleicons.org/trello/FFFFFF",
      bgColor: "bg-blue-500",
      textColor: "text-white",
    },
    posthog: {
      url: "https://cdn.simpleicons.org/posthog/FFFFFF",
      bgColor: "bg-yellow-500",
      textColor: "text-gray-900",
    },
    youtube: {
      url: "https://cdn.simpleicons.org/youtube/FFFFFF",
      bgColor: "bg-red-600",
      textColor: "text-white",
    },
    "google-sheet": {
      useLucide: true,
      bgColor: "bg-green-600",
      textColor: "text-white",
    },
    "google-sheets": {
      useLucide: true,
      bgColor: "bg-green-600",
      textColor: "text-white",
    },
    google: {
      url: "https://cdn.simpleicons.org/google/FFFFFF",
      bgColor: "bg-blue-500",
      textColor: "text-white",
    },
  };

  return (
    logoMap[integrationId.toLowerCase()] ?? {
      url: "https://cdn.simpleicons.org/internetarchive/FFFFFF",
      bgColor: "bg-gray-600",
      textColor: "text-white",
    }
  );
};

const getMetricDialog = (integrationId: string) => {
  const dialogs = {
    github: GitHubMetricDialog,
    posthog: PostHogMetricDialog,
    youtube: YouTubeMetricDialog,
    "google-sheet": GoogleSheetsMetricDialog,
    "google-sheets": GoogleSheetsMetricDialog,
  };
  return dialogs[integrationId.toLowerCase() as keyof typeof dialogs];
};

export function IntegrationClient({
  initialData,
  gridCols = 4,
  onMetricCreated,
}: IntegrationClientProps) {
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">KPIs</h2>
        <Button onClick={handleConnect} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          {isLoading ? "Connecting..." : "Platform"}
        </Button>
      </div>

      {status && (
        <Alert>
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {/* Connected Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Platforms</CardTitle>
          <CardDescription>
            {integrations?.length
              ? `${integrations.length} active platform${integrations.length > 1 ? "s" : ""}`
              : "No platforms connected yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations && integrations.length > 0 ? (
            <div
              className={`grid gap-4 ${gridCols === 2 ? "grid-cols-2" : "grid-cols-4"}`}
            >
              {integrations.map((integration) => {
                const logo = getIntegrationLogo(integration.integrationId);
                const MetricDialog = getMetricDialog(integration.integrationId);

                return (
                  <div key={integration.id} className="space-y-3">
                    <div className="group relative aspect-square">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevoke(integration.connectionId)}
                        disabled={revokeMutation.isPending}
                        className="absolute top-1 right-1 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>

                      <div className="absolute top-2 left-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      </div>

                      <div
                        className={`flex h-full w-full flex-col items-center justify-center rounded-lg border ${logo.bgColor}`}
                      >
                        <div className="relative h-16 w-16">
                          {logo.useLucide ? (
                            <FileSpreadsheet className="h-16 w-16 text-white" />
                          ) : (
                            <Image
                              src={logo.url!}
                              alt={`${integration.integrationId} logo`}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          )}
                        </div>
                        <p
                          className={`mt-3 text-sm font-medium capitalize ${logo.textColor}`}
                        >
                          {integration.integrationId}
                        </p>
                        <p
                          className={`mt-1 text-xs opacity-80 ${logo.textColor}`}
                        >
                          {new Date(integration.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </div>

                    {MetricDialog && (
                      <MetricDialog
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            KPI
                          </Button>
                        }
                        onSuccess={() => {
                          void refetchIntegrations();
                          onMetricCreated?.();
                        }}
                      />
                    )}
                  </div>
                );
              })}
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
