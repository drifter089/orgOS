"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

export interface MetricCreateInput {
  templateId: string;
  connectionId: string;
  name: string;
  description: string;
  endpointParams: Record<string, string>;
  teamId?: string;
}

export interface ContentProps {
  connection: {
    id: string;
    connectionId: string;
    integrationId: string;
    createdAt: Date;
  };
  onSubmit: (data: MetricCreateInput) => void;
  isCreating: boolean;
  error: string | null;
}

interface MetricDialogBaseProps {
  integrationId: string;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  maxWidth?: string;
  teamId?: string;
  children: (props: ContentProps) => React.ReactNode;
}

type MetricWithIntegration = RouterOutputs["metric"]["getAll"][number];

export function MetricDialogBase({
  integrationId,
  title,
  description,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  maxWidth = "sm:max-w-[600px]",
  teamId,
  children,
}: MetricDialogBaseProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const utils = api.useUtils();

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === integrationId,
  );

  const createMetric = api.metric.create.useMutation({
    onMutate: async (newMetric) => {
      await utils.metric.getAll.cancel();
      if (teamId) {
        await utils.metric.getByTeamId.cancel({ teamId });
      }

      const previousAll = utils.metric.getAll.getData();
      const previousTeam = teamId
        ? utils.metric.getByTeamId.getData({ teamId })
        : undefined;

      const optimisticMetric: MetricWithIntegration = {
        id: `temp-${Date.now()}`,
        name: newMetric.name,
        description: newMetric.description ?? null,
        organizationId: "",
        integrationId: newMetric.connectionId,
        metricTemplate: newMetric.templateId,
        endpointConfig: newMetric.endpointParams,
        teamId: teamId ?? null,
        lastFetchedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        integration: connection
          ? {
              id: connection.id,
              connectionId: connection.connectionId,
              integrationId: connection.integrationId,
              organizationId: "",
              connectedBy: "",
              status: "active",
              metadata: null,
              lastSyncAt: null,
              errorMessage: null,
              createdAt: connection.createdAt,
              updatedAt: connection.createdAt,
            }
          : null,
      };

      utils.metric.getAll.setData(undefined, (old) =>
        old ? [...old, optimisticMetric] : [optimisticMetric],
      );

      if (teamId) {
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old ? [...old, optimisticMetric] : [optimisticMetric],
        );
      }

      return { previousAll, previousTeam };
    },

    onError: (err, _variables, context) => {
      if (context?.previousAll) {
        utils.metric.getAll.setData(undefined, context.previousAll);
      }
      if (context?.previousTeam && teamId) {
        utils.metric.getByTeamId.setData({ teamId }, context.previousTeam);
      }
      setError(err.message);
    },

    onSuccess: (createdMetric, variables) => {
      utils.metric.getAll.setData(undefined, (old) =>
        old?.map((m) =>
          m.id.startsWith("temp-") && m.name === variables.name
            ? createdMetric
            : m,
        ),
      );

      if (teamId) {
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old?.map((m) =>
            m.id.startsWith("temp-") && m.name === variables.name
              ? createdMetric
              : m,
          ),
        );
      }

      setOpen?.(false);
      setError(null);
      onSuccess?.();
    },

    onSettled: () => {
      void utils.metric.getAll.invalidate();
      if (teamId) {
        void utils.metric.getByTeamId.invalidate({ teamId });
      }
    },
  });

  const handleSubmit = (data: MetricCreateInput) => {
    setError(null);
    createMetric.mutate({ ...data, teamId });
  };

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No {integrationId} Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Please connect your {integrationId} account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", maxWidth)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children({
          connection,
          onSubmit: handleSubmit,
          isCreating: createMetric.isPending,
          error,
        })}

        {error && <p className="text-destructive text-sm">Error: {error}</p>}
      </DialogContent>
    </Dialog>
  );
}
