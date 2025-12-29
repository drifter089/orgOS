"use client";

import { useState } from "react";

import Image from "next/image";

import { FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface IntegrationGridProps {
  initialData: IntegrationsWithStats;
  gridCols?: 2 | 3 | 4 | "auto";
  size?: "sm" | "md";
  showMetricDialogs?: boolean;
  onMetricCreated?: () => void;
  teamId?: string;
  MetricDialogs?: Record<
    string,
    React.ComponentType<{
      trigger?: React.ReactNode;
      onSuccess?: () => void;
      teamId?: string;
      connectionId?: string;
    }>
  >;
  extraCards?: React.ReactNode;
}

export function IntegrationGrid({
  initialData,
  gridCols = 4,
  size = "md",
  showMetricDialogs = false,
  onMetricCreated,
  teamId,
  MetricDialogs,
  extraCards,
}: IntegrationGridProps) {
  const { confirm } = useConfirmation();
  const utils = api.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data, refetch } = api.integration.listWithStats.useQuery(undefined, {
    initialData,
  });

  const integrations = data?.active;

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
    onError: (error, _variables, context) => {
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

  if ((!integrations || integrations.length === 0) && !extraCards) {
    return (
      <div className="text-muted-foreground space-y-2 py-8 text-center">
        <p>No platforms connected yet</p>
        <p className="text-sm">Connect a platform to get started</p>
      </div>
    );
  }

  const gridClasses = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    auto: "grid-cols-[repeat(auto-fit,minmax(100px,1fr))]",
  };

  const iconSize = size === "sm" ? "h-10 w-10" : "h-16 w-16";

  return (
    <div className={cn("grid gap-4", gridClasses[gridCols])}>
      {integrations.map((integration) => {
        const config = getPlatformConfig(integration.providerId);
        const MetricDialog = MetricDialogs?.[integration.providerId];

        return (
          <div
            key={integration.id}
            className="flex flex-col gap-2"
            onMouseEnter={() =>
              handleIntegrationHover(
                integration.providerId,
                integration.connectionId,
              )
            }
          >
            {/* Platform Card */}
            <div className="group relative aspect-square">
              {/* Delete button (hover) */}
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  handleRevoke(integration.connectionId, config.name)
                }
                disabled={revokeMutation.isPending}
                className="absolute top-1 right-1 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>

              {/* Edit button (hover) */}
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  startEditing(
                    integration.connectionId,
                    integration.displayName,
                  )
                }
                className="absolute top-1 left-1 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              {/* Platform logo */}
              <div
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center rounded-lg border",
                  config.bgColor,
                )}
              >
                <div className={cn("relative", iconSize)}>
                  {config.useLucideIcon ? (
                    <FileSpreadsheet
                      className={cn(iconSize, config.textColor)}
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
                    onBlur={() => handleSaveName(integration.connectionId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleSaveName(integration.connectionId);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    placeholder={config.name}
                    className="mt-2 h-7 w-[90%] text-center text-xs"
                  />
                ) : (
                  <p
                    className={cn(
                      "font-medium",
                      size === "sm" ? "mt-2 text-xs" : "mt-3 text-sm",
                      config.textColor,
                    )}
                  >
                    {integration.displayName ?? config.name}
                  </p>
                )}
                {size !== "sm" && (
                  <p
                    className={cn("mt-1 text-xs opacity-80", config.textColor)}
                  >
                    {(integration.metadata as { email?: string })?.email ??
                      new Date(integration.createdAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                  </p>
                )}
              </div>
            </div>

            {/* Add KPI button (if enabled) */}
            {showMetricDialogs && MetricDialog && (
              <MetricDialog
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-accent w-full shadow-sm transition-all hover:shadow-md"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
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
      {extraCards}
    </div>
  );
}
