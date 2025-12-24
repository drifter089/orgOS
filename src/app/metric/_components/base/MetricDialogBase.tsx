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
import { useMetricMutations } from "@/hooks/use-metric-mutations";
import { cn } from "@/lib/utils";
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

/**
 * Simplified metric dialog - just form submission, no steps.
 *
 * After successful creation:
 * - Dialog closes immediately
 * - Optimistic card appears on dashboard with loading state
 * - Dashboard centralized polling handles progress tracking
 */
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

  const { create: createMutation } = useMetricMutations({ teamId });
  const utils = api.useUtils();

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find((int) =>
    connectionIdProp
      ? int.connectionId === connectionIdProp
      : int.providerId === integrationId,
  );

  const handleSubmit = async (data: MetricCreateInput) => {
    setError(null);

    try {
      // Create the metric - wait for server response
      await createMutation.mutateAsync({
        ...data,
        teamId,
      });

      // Explicitly invalidate cache to ensure new card shows
      // This triggers a refetch which will include the new metric
      await Promise.all([
        utils.dashboard.getDashboardCharts.invalidate(),
        teamId
          ? utils.dashboard.getDashboardCharts.invalidate({ teamId })
          : Promise.resolve(),
      ]);

      // Success! Close dialog
      toast.success("KPI created", {
        description: "Building your chart...",
      });
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to create KPI");
    }
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
