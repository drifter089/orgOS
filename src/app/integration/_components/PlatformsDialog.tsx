"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import Nango from "@nangohq/frontend";
import {
  Check,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  GitHubMetricDialog,
  GoogleSheetsMetricDialog,
  LinearMetricDialog,
  ManualMetricDialog,
  PostHogMetricDialog,
  YouTubeMetricDialog,
} from "@/app/metric/_components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

const AVAILABLE_PLATFORMS = [
  { id: "github", name: "GitHub" },
  { id: "posthog", name: "PostHog" },
  { id: "youtube", name: "YouTube" },
  { id: "google-sheet", name: "Google Sheets" },
  { id: "linear", name: "Linear" },
] as const;

const METRIC_DIALOGS: Record<
  string,
  React.ComponentType<{
    trigger?: React.ReactNode;
    onSuccess?: () => void;
    teamId?: string;
    connectionId?: string;
  }>
> = {
  github: GitHubMetricDialog,
  posthog: PostHogMetricDialog,
  youtube: YouTubeMetricDialog,
  "google-sheet": GoogleSheetsMetricDialog,
  linear: LinearMetricDialog,
};

interface PlatformsDialogProps {
  teamId: string;
  initialIntegrations: IntegrationsWithStats;
  onMetricCreated?: () => void;
  trigger?: React.ReactNode;
}

export function PlatformsDialog({
  teamId,
  initialIntegrations,
  onMetricCreated,
  trigger,
}: PlatformsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { confirm } = useConfirmation();
  const utils = api.useUtils();

  const { data, refetch } = api.integration.listWithStats.useQuery(undefined, {
    initialData: initialIntegrations,
  });

  const connectedIntegrations = data?.active ?? [];

  const connectedProviderIds = new Set(
    connectedIntegrations.map((i) => i.providerId),
  );

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
        const result = await refetch();

        if (
          result.data?.active.some(
            (integration) => integration.connectionId === connectionId,
          )
        ) {
          setConnectingPlatform(null);
          onMetricCreated?.();
          return;
        }

        if (attempts >= maxAttempts) {
          setConnectingPlatform(null);
          return;
        }

        pollingTimeoutRef.current = setTimeout(() => {
          void poll();
        }, interval);
      } catch {
        setConnectingPlatform(null);
      }
    };

    await poll();
  };

  const handleConnectPlatform = async (platformId: string) => {
    try {
      setConnectingPlatform(platformId);

      const response = await fetch("/api/nango/session", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to get session token");
      }

      const sessionData = (await response.json()) as { sessionToken: string };

      const nango = new Nango({
        connectSessionToken: sessionData.sessionToken,
      });
      nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === "connect") {
            void pollForIntegration(event.payload.connectionId);
          } else if (event.type === "close") {
            setConnectingPlatform(null);
          }
        },
      });
    } catch (error) {
      console.error("Connection error:", error);
      setConnectingPlatform(null);
    }
  };

  const revokeMutation = api.integration.revoke.useMutation({
    onMutate: async ({ connectionId }) => {
      await utils.integration.listWithStats.cancel();
      const previousData = utils.integration.listWithStats.getData();

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
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        utils.integration.listWithStats.setData(
          undefined,
          context.previousData,
        );
      }
    },
    onSettled: async () => {
      await utils.integration.listWithStats.invalidate();
    },
  });

  const updateNameMutation = api.integration.updateDisplayName.useMutation({
    onSuccess: () => utils.integration.listWithStats.invalidate(),
  });

  const handleSaveName = (connectionId: string) => {
    updateNameMutation.mutate({
      connectionId,
      displayName: editValue.trim() || null,
    });
    setEditingId(null);
  };

  const startEditing = (connectionId: string, currentName: string | null) => {
    setEditingId(connectionId);
    setEditValue(currentName ?? "");
  };

  const handleRevoke = async (
    connectionId: string,
    integrationName: string,
  ) => {
    const confirmed = await confirm({
      title: "Delete integration",
      description: `Are you sure you want to delete ${integrationName}? Metrics using this integration will stop receiving updates.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      revokeMutation.mutate({ connectionId });
    }
  };

  const integrationEndpoints: Record<string, string> = {
    github: "/user/repos?per_page=100&sort=updated",
    youtube:
      "/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50",
    posthog: "/api/projects/",
  };

  const handleIntegrationHover = (
    integrationId: string,
    connectionId: string,
  ) => {
    const endpoint = integrationEndpoints[integrationId];
    if (endpoint) {
      void utils.metric.fetchIntegrationData.prefetch(
        { connectionId, integrationId, endpoint, method: "GET" },
        { staleTime: 5 * 60 * 1000 },
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Platforms
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Platforms & KPIs</DialogTitle>
          <DialogDescription>
            Connect platforms to track metrics and create KPIs for your
            dashboard
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Available Platforms</h3>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {AVAILABLE_PLATFORMS.map((platform) => {
                  const config = getPlatformConfig(platform.id);
                  const isConnected = connectedProviderIds.has(platform.id);
                  const isConnecting = connectingPlatform === platform.id;

                  return (
                    <button
                      key={platform.id}
                      onClick={() => handleConnectPlatform(platform.id)}
                      disabled={isConnecting}
                      className={cn(
                        "group relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-all",
                        "hover:border-primary/50 hover:shadow-md",
                        isConnected && "border-green-500/50 bg-green-500/5",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          config.bgColor,
                        )}
                      >
                        {config.useLucideIcon ? (
                          <FileSpreadsheet
                            className={cn("h-5 w-5", config.textColor)}
                          />
                        ) : (
                          <div className="relative h-5 w-5">
                            <Image
                              src={config.logo!}
                              alt={config.name}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium">{config.name}</span>
                      {isConnected && (
                        <Badge
                          variant="secondary"
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                      {isConnecting && (
                        <div className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-lg">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Connected Integrations</h3>

              {connectedIntegrations.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
                  No platforms connected yet. Click a platform above to connect.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {connectedIntegrations.map((integration) => {
                    const config = getPlatformConfig(integration.providerId);
                    const MetricDialog = METRIC_DIALOGS[integration.providerId];

                    return (
                      <div
                        key={integration.id}
                        className="group flex flex-col gap-2"
                        onMouseEnter={() =>
                          handleIntegrationHover(
                            integration.providerId,
                            integration.connectionId,
                          )
                        }
                      >
                        <div className="relative aspect-square">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRevoke(
                                integration.connectionId,
                                config.name,
                              )
                            }
                            disabled={revokeMutation.isPending}
                            className="absolute top-1 right-1 z-10 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              startEditing(
                                integration.connectionId,
                                integration.displayName,
                              )
                            }
                            className="absolute top-1 left-1 z-10 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <div
                            className={cn(
                              "flex h-full w-full flex-col items-center justify-center rounded-lg border",
                              config.bgColor,
                            )}
                          >
                            <div className="relative h-8 w-8">
                              {config.useLucideIcon ? (
                                <FileSpreadsheet
                                  className={cn("h-8 w-8", config.textColor)}
                                />
                              ) : (
                                <Image
                                  src={config.logo!}
                                  alt={`${config.name} logo`}
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              )}
                            </div>
                            {editingId === integration.connectionId ? (
                              <Input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() =>
                                  handleSaveName(integration.connectionId)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleSaveName(integration.connectionId);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                placeholder={config.name}
                                className="mt-2 h-6 w-[90%] text-center text-xs"
                              />
                            ) : (
                              <p
                                className={cn(
                                  "mt-2 text-xs font-medium",
                                  config.textColor,
                                )}
                              >
                                {integration.displayName ?? config.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {MetricDialog && (
                          <MetricDialog
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:bg-accent w-full shadow-sm transition-all hover:shadow-md"
                              >
                                <Plus className="mr-1.5 h-3 w-3" />
                                Add KPI
                              </Button>
                            }
                            teamId={teamId}
                            connectionId={integration.connectionId}
                            onSuccess={() => {
                              void refetch();
                              onMetricCreated?.();
                            }}
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="flex flex-col gap-2">
                    <div className="relative aspect-square">
                      <div
                        className={cn(
                          "flex h-full w-full flex-col items-center justify-center rounded-lg border",
                          "bg-stone-200 dark:bg-stone-700",
                        )}
                      >
                        <div className="relative h-8 w-8">
                          <FileSpreadsheet className="h-8 w-8 text-stone-700 dark:text-stone-200" />
                        </div>
                        <p className="mt-2 text-xs font-medium text-stone-700 dark:text-stone-200">
                          Manual
                        </p>
                      </div>
                    </div>
                    <ManualMetricDialog
                      teamId={teamId}
                      onSuccess={onMetricCreated}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-accent w-full shadow-sm transition-all hover:shadow-md"
                        >
                          <Plus className="mr-1.5 h-3 w-3" />
                          Add KPI
                        </Button>
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
