"use client";

import { useState } from "react";

import { toast } from "sonner";

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
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

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
    providerId: string;
    displayName?: string | null;
    createdAt: Date;
  };
  onSubmit: (data: MetricCreateInput) => void | Promise<void>;
  isCreating: boolean;
  error: string | null;
}

interface MetricDialogBaseProps {
  integrationId: string;
  connectionId?: string;
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

export function MetricDialogBase({
  integrationId,
  connectionId: connectionIdProp,
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
  const setOpen = (value: boolean | undefined) => {
    if (isControlled) {
      onOpenChange?.(value ?? false);
    } else {
      setInternalOpen(value ?? false);
    }
  };

  const utils = api.useUtils();
  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find((int) =>
    connectionIdProp
      ? int.connectionId === connectionIdProp
      : int.providerId === integrationId,
  );

  const createMutation = api.metric.create.useMutation({
    onSuccess: (result) => {
      const enrichedResult = {
        ...result,
        goalProgress: null,
        valueLabel: null,
        dataDescription: null,
        metric: { ...result.metric, goal: null },
      } as DashboardChartWithRelations;

      // Update cache for this team
      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
          if (!old) return [enrichedResult];
          if (old.some((dc) => dc.id === result.id)) return old;
          return [...old, enrichedResult];
        });
      }

      toast.success("KPI created", { description: "Building your chart..." });
      setOpen(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error("Failed to create KPI");
    },
  });

  const handleSubmit = async (data: MetricCreateInput) => {
    setError(null);
    await createMutation.mutateAsync({ ...data, teamId });
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
          isCreating: createMutation.isPending,
          error,
        })}

        {error && <p className="text-destructive text-sm">Error: {error}</p>}
      </DialogContent>
    </Dialog>
  );
}
