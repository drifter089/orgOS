"use client";

import { memo, useCallback, useState } from "react";

import {
  Gauge,
  Loader2,
  Settings,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { Link } from "next-transition-router";

import { Button } from "@/components/ui/button";
import { useRoleData, useUserName } from "@/hooks/use-role-data";
import { stripHtml } from "@/lib/html-utils";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import { type ChartTransformResult } from "@/lib/metrics/transformer-types";
import { cn } from "@/lib/utils";
import { useConfirmationOptional } from "@/providers/ConfirmationDialogProvider";
import { api } from "@/trpc/react";

/**
 * Role data structure for direct data or override props.
 * This allows the component to work with pre-fetched data.
 */
export type RoleCardData = {
  id: string;
  title: string;
  purpose: string;
  color: string;
  effortPoints?: number | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  metric?: {
    name: string;
    dashboardCharts?: Array<{
      chartConfig: unknown;
    }>;
  } | null;
};

interface RoleCardProps {
  /** Direct role data - use this when data is already fetched */
  role?: RoleCardData;
  /** Role ID for cache lookup - use with teamId */
  roleId?: string;
  /** Team ID for cache lookup and delete mutation */
  teamId?: string;

  /** Pending state during optimistic create */
  isPending?: boolean;
  /** Temporary title during optimistic create */
  pendingTitle?: string;
  /** Temporary color during optimistic create */
  pendingColor?: string;

  /** Override data for public views that can't use hooks */
  roleDataOverride?: RoleCardData;
  /** Pre-resolved user name for public views */
  userNameOverride?: string | null;

  /** Display variant: canvas (320x160) or list (compact) */
  variant?: "canvas" | "list";
  /** Visual selection state (canvas variant only) */
  selected?: boolean;
  /** Hide all buttons and disable interactions */
  readOnly?: boolean;

  /** Callback when edit button is clicked */
  onEdit?: () => void;
  /** Custom delete handler - if not provided, uses internal delete logic */
  onDelete?: () => void;

  /** Additional className */
  className?: string;
}

function RoleCardComponent({
  role: directRole,
  roleId,
  teamId,
  isPending = false,
  pendingTitle,
  pendingColor,
  roleDataOverride,
  userNameOverride,
  variant = "canvas",
  selected = false,
  readOnly = false,
  onEdit,
  onDelete,
  className,
}: RoleCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm } = useConfirmationOptional();

  // Fetch role data from cache if roleId is provided and no direct data
  const roleFromCache = useRoleData(teamId ?? "", roleId ?? "");
  const userNameFromHook = useUserName(
    roleFromCache?.assignedUserId ?? directRole?.assignedUserId,
  );

  // Data priority: override > direct > cache > pending
  const role = roleDataOverride ?? directRole ?? roleFromCache;
  const assignedUserName =
    userNameOverride ?? role?.assignedUserName ?? userNameFromHook;

  // Use pending data during optimistic create, otherwise use resolved data
  const title = role?.title ?? pendingTitle ?? "Untitled Role";
  const purpose = role?.purpose ?? "";
  const color = role?.color ?? pendingColor ?? "#3b82f6";
  const metricName = role?.metric?.name;
  const effortPoints = role?.effortPoints;
  const roleIdResolved = role?.id ?? roleId ?? "";

  // Metric value extraction
  const dashboardCharts = role?.metric?.dashboardCharts;
  const chartConfig = dashboardCharts?.[0]
    ?.chartConfig as ChartTransformResult | null;
  const latestMetric = getLatestMetricValue(chartConfig);
  const metricValue = latestMetric?.value;
  const metricDate = latestMetric?.date;
  const isValueLoading = metricName && dashboardCharts?.length === 0;

  // Delete mutation
  const utils = api.useUtils();
  const deleteRoleMutation = api.role.delete.useMutation({
    onMutate: async () => {
      if (!teamId) return;
      await utils.role.getByTeamId.cancel({ teamId });
      const previousRoles = utils.role.getByTeamId.getData({ teamId });
      utils.role.getByTeamId.setData({ teamId }, (old) => {
        if (!old) return [];
        return old.filter((r) => r.id !== roleIdResolved);
      });
      return { previousRoles };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRoles && teamId) {
        utils.role.getByTeamId.setData({ teamId }, context.previousRoles);
      }
    },
    onSettled: () => {
      if (teamId) {
        void utils.role.getByTeamId.invalidate({ teamId });
        void utils.team.getById.invalidate({ id: teamId });
        void utils.dashboard.getDashboardCharts.invalidate({ teamId });
      }
    },
  });

  const handleDelete = useCallback(async () => {
    if (onDelete) {
      onDelete();
      return;
    }

    if (!teamId || !roleIdResolved) return;

    const confirmed = await confirm({
      title: "Delete role",
      description: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      setIsDeleting(true);
      deleteRoleMutation.mutate(
        { id: roleIdResolved },
        { onSettled: () => setIsDeleting(false) },
      );
    }
  }, [onDelete, teamId, roleIdResolved, title, confirm, deleteRoleMutation]);

  // Strip HTML and truncate for display
  const plainPurpose = stripHtml(purpose);
  const truncatedPurpose =
    plainPurpose.length > 100
      ? plainPurpose.substring(0, 100) + "..."
      : plainPurpose;

  const showActions = !isPending && !readOnly && (onEdit ?? teamId);

  if (variant === "list") {
    return (
      <div
        className={cn(
          "bg-card group relative rounded-lg border p-3 transition-all hover:shadow-md",
          isPending && "opacity-60",
          isDeleting && "opacity-50",
          className,
        )}
        style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
      >
        {/* Action Buttons */}
        {showActions && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-7 w-7"
                title="Edit role"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
            {(onDelete ?? teamId) && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete();
                }}
                disabled={isDeleting}
                className="hover:bg-destructive/10 hover:text-destructive h-7 w-7"
                title="Delete role"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: `${color}20` }}
          >
            <User className="h-4 w-4" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            {isPending && (
              <div className="flex items-center gap-1">
                <div className="bg-primary h-1 w-1 animate-pulse rounded-full" />
                <div
                  className="bg-primary h-1 w-1 animate-pulse rounded-full"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="bg-primary h-1 w-1 animate-pulse rounded-full"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Purpose */}
        {truncatedPurpose && (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
            {truncatedPurpose}
          </p>
        )}

        {/* Footer Info */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Assigned User */}
          {assignedUserName && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <User className="h-3 w-3" />
              {role?.assignedUserId ? (
                <Link
                  href={`/member/${role.assignedUserId}`}
                  className="hover:text-primary truncate underline-offset-2 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {assignedUserName}
                </Link>
              ) : (
                <span className="truncate">{assignedUserName}</span>
              )}
            </div>
          )}

          {/* Metric Badge */}
          {metricName && (
            <div className="bg-muted flex items-center gap-1 rounded px-1.5 py-0.5 text-xs">
              <TrendingUp className="h-3 w-3" />
              <span className="truncate">{metricName}</span>
              {metricValue !== undefined && (
                <span className="text-primary font-semibold">
                  {Number.isInteger(metricValue)
                    ? metricValue
                    : metricValue.toFixed(1)}
                </span>
              )}
            </div>
          )}

          {/* Effort Points */}
          {effortPoints && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Gauge className="h-3 w-3" />
              <span>{effortPoints}pt</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Canvas variant (320x160)
  return (
    <div
      className={cn(
        "bg-card group relative flex flex-col rounded-lg border transition-all duration-200 hover:shadow-lg",
        "h-[160px] w-[320px]",
        selected && "ring-primary ring-2 ring-offset-2",
        isPending && "opacity-70",
        isDeleting && "opacity-50",
        className,
      )}
      style={{ borderColor: color }}
    >
      {/* Action Buttons */}
      {showActions && (
        <div className="nodrag absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={cn(
                "h-6 w-6",
                "hover:bg-primary/10 hover:text-primary",
              )}
              title="Edit role"
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          {(onDelete ?? teamId) && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete();
              }}
              disabled={isDeleting}
              className={cn(
                "h-6 w-6",
                "hover:bg-destructive/10 hover:text-destructive",
              )}
              title="Delete role"
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      )}

      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2 rounded-t-md px-4 py-2"
        style={{ backgroundColor: `${color}15` }}
      >
        <User className="h-5 w-5" style={{ color }} />
        <h3 className="truncate text-sm font-semibold">{title}</h3>
        {isPending && (
          <div className="ml-auto flex items-center gap-1">
            <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
            <div
              className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-4 py-2">
        {/* Purpose */}
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {truncatedPurpose}
        </p>

        {/* Metric & Assigned User - at bottom */}
        <div className="mt-auto space-y-1">
          {/* Metric */}
          {metricName && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="text-muted-foreground h-3 w-3 shrink-0" />
                <span className="truncate font-medium">{metricName}</span>
                {isValueLoading ? (
                  <Loader2 className="text-muted-foreground ml-auto h-3 w-3 shrink-0 animate-spin" />
                ) : metricValue !== undefined ? (
                  <span className="text-primary ml-auto shrink-0 font-semibold">
                    {Number.isInteger(metricValue)
                      ? metricValue
                      : metricValue.toFixed(1)}
                  </span>
                ) : null}
              </div>
              {metricDate && (
                <p className="text-muted-foreground/70 pl-5 text-[10px]">
                  {metricDate}
                </p>
              )}
            </div>
          )}

          {/* Assigned User */}
          {assignedUserName && (
            <div className="flex items-center gap-2 text-xs">
              <User className="text-muted-foreground h-3 w-3 shrink-0" />
              {role?.assignedUserId ? (
                <Link
                  href={`/member/${role.assignedUserId}`}
                  className="nodrag hover:text-primary truncate font-medium underline-offset-2 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {assignedUserName}
                </Link>
              ) : (
                <span className="truncate font-medium">{assignedUserName}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Effort Points */}
      {effortPoints && (
        <div className="border-border/50 shrink-0 border-t px-4 py-1.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5" />
            <span>
              {effortPoints} {effortPoints === 1 ? "point" : "points"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export const RoleCard = memo(RoleCardComponent);
