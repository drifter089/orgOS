"use client";

import Image from "next/image";

import { CheckCircle2, FileSpreadsheet, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPlatformConfig } from "@/lib/platform-config";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface IntegrationGridProps {
  initialData: IntegrationsWithStats;
  gridCols?: 2 | 4;
  showMetricDialogs?: boolean;
  onMetricCreated?: () => void;
  teamId?: string;
  MetricDialogs?: Record<
    string,
    React.ComponentType<{
      trigger?: React.ReactNode;
      onSuccess?: () => void;
      teamId?: string;
    }>
  >;
}

export function IntegrationGrid({
  initialData,
  gridCols = 4,
  showMetricDialogs = false,
  onMetricCreated,
  teamId,
  MetricDialogs,
}: IntegrationGridProps) {
  const { confirm } = useConfirmation();
  const utils = api.useUtils();

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

  if (!integrations || integrations.length === 0) {
    return (
      <div className="text-muted-foreground space-y-2 py-8 text-center">
        <p>No platforms connected yet</p>
        <p className="text-sm">Connect a platform to get started</p>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-4 ${gridCols === 2 ? "md:grid-cols-2" : "md:grid-cols-4"}`}
    >
      {integrations.map((integration) => {
        const config = getPlatformConfig(integration.integrationId);
        const MetricDialog = MetricDialogs?.[integration.integrationId];

        return (
          <div
            key={integration.id}
            className="space-y-3"
            onMouseEnter={() =>
              handleIntegrationHover(
                integration.integrationId,
                integration.connectionId,
              )
            }
          >
            {/* Platform Card */}
            <div className="group relative aspect-square">
              {/* Delete button (hover) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  handleRevoke(integration.connectionId, config.name)
                }
                disabled={revokeMutation.isPending}
                className="absolute top-1 right-1 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>

              {/* Active badge (hover) */}
              <div className="absolute top-2 left-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                <Badge variant="default" className="text-xs">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              </div>

              {/* Platform logo */}
              <div
                className={`flex h-full w-full flex-col items-center justify-center rounded-lg border ${config.bgColor}`}
              >
                <div className="relative h-16 w-16">
                  {config.useLucideIcon ? (
                    <FileSpreadsheet
                      className={`h-16 w-16 ${config.textColor}`}
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
                <p className={`mt-3 text-sm font-medium ${config.textColor}`}>
                  {config.name}
                </p>
                <p className={`mt-1 text-xs opacity-80 ${config.textColor}`}>
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

            {/* Add KPI button (if enabled) */}
            {showMetricDialogs && MetricDialog && (
              <MetricDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    KPI
                  </Button>
                }
                teamId={teamId}
                onSuccess={() => {
                  void refetch();
                  onMetricCreated?.();
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
