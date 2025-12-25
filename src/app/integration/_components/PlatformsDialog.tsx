"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import Nango from "@nangohq/frontend";
import { FileSpreadsheet, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import {
  GitHubMetricDialog,
  GoogleSheetsMetricDialog,
  LinearMetricDialog,
  ManualMetricDialog,
  PostHogMetricDialog,
  YouTubeMetricDialog,
} from "@/app/metric/_components";
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
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { confirm } = useConfirmation();
  const utils = api.useUtils();

  const { data, refetch } = api.integration.listWithStats.useQuery(undefined, {
    initialData: initialIntegrations,
  });

  const connectedIntegrations = data?.active ?? [];
  const [isConnecting, setIsConnecting] = useState(false);

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
          setIsConnecting(false);
          onMetricCreated?.();
          return;
        }

        if (attempts >= maxAttempts) {
          setIsConnecting(false);
          return;
        }

        pollingTimeoutRef.current = setTimeout(() => {
          void poll();
        }, interval);
      } catch {
        setIsConnecting(false);
      }
    };

    await poll();
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

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
            setIsConnecting(false);
          }
        },
      });
    } catch (error) {
      console.error("Connection error:", error);
      setIsConnecting(false);
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
            KPI
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Platforms & KPIs</DialogTitle>
              <DialogDescription>
                Connect platforms and create KPIs for your dashboard
              </DialogDescription>
            </div>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {isConnecting ? "Connecting..." : "Platform"}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 pr-4">
            {connectedIntegrations.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
                <p className="text-sm">No platforms connected yet</p>
                <p className="text-muted-foreground/70 mt-1 text-xs">
                  Click &quot;+ Platform&quot; above to connect your first
                  integration
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {connectedIntegrations.map((integration) => {
                  const config = getPlatformConfig(integration.providerId);
                  const MetricDialog = METRIC_DIALOGS[integration.providerId];

                  return (
                    <div
                      key={integration.id}
                      className="group flex flex-col gap-3"
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
                            handleRevoke(integration.connectionId, config.name)
                          }
                          disabled={revokeMutation.isPending}
                          className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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
                          className="absolute top-2 left-2 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <div
                          className={cn(
                            "flex h-full w-full flex-col items-center justify-center rounded-xl border-2",
                            config.bgColor,
                          )}
                        >
                          <div className="relative h-12 w-12">
                            {config.useLucideIcon ? (
                              <FileSpreadsheet
                                className={cn("h-12 w-12", config.textColor)}
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
                              className="mt-3 h-7 w-[90%] text-center text-sm"
                            />
                          ) : (
                            <p
                              className={cn(
                                "mt-3 text-sm font-medium",
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
                              size="default"
                              className="hover:bg-accent w-full shadow-sm transition-all hover:shadow-md"
                            >
                              <Plus className="mr-2 h-4 w-4" />
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

                <div className="flex flex-col gap-3">
                  <div className="relative aspect-square">
                    <div
                      className={cn(
                        "flex h-full w-full flex-col items-center justify-center rounded-xl border-2",
                        "bg-stone-200 dark:bg-stone-700",
                      )}
                    >
                      <div className="relative h-12 w-12">
                        <FileSpreadsheet className="h-12 w-12 text-stone-700 dark:text-stone-200" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-stone-700 dark:text-stone-200">
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
                        size="default"
                        className="hover:bg-accent w-full shadow-sm transition-all hover:shadow-md"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add KPI
                      </Button>
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
