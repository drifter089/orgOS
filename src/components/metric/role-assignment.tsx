"use client";

import { useState } from "react";

import { AlertTriangle, Gauge, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOptimisticRoleUpdate } from "@/hooks/use-optimistic-role-update";
import { getUserName } from "@/lib/helpers/get-user-name";
import { api } from "@/trpc/react";

const MAX_ROLES_PER_METRIC = 3;

interface RoleAssignmentProps {
  metricId: string;
  metricName: string;
  teamId: string;
  /** Currently assigned role IDs for this metric */
  assignedRoleIds?: string[];
  /** Callback when assignment changes */
  onAssign?: () => void;
}

export function RoleAssignment({
  metricId,
  metricName,
  teamId,
  assignedRoleIds = [],
  onAssign,
}: RoleAssignmentProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    roleId: string;
    roleTitle: string;
    existingMetricName: string;
  } | null>(null);

  const { data: members } = api.organization.getMembers.useQuery();

  // Fetch all roles in the team
  const { data: teamRoles, isLoading: isLoadingRoles } =
    api.role.getByTeamId.useQuery({ teamId });

  const updateRole = useOptimisticRoleUpdate(teamId);

  const isAtLimit = assignedRoleIds.length >= MAX_ROLES_PER_METRIC;

  const handleRoleSelect = (roleId: string) => {
    if (!teamRoles) return;

    const selectedRole = teamRoles.find((r) => r.id === roleId);
    if (!selectedRole) return;

    // Check if role already has a different metric assigned
    if (selectedRole.metricId && selectedRole.metricId !== metricId) {
      const existingMetricName = selectedRole.metric?.name ?? "another metric";
      setConfirmDialog({
        open: true,
        roleId,
        roleTitle: selectedRole.title,
        existingMetricName,
      });
      return;
    }

    // If role doesn't have a metric or has this metric, just assign
    updateRole.mutate(
      { id: roleId, metricId },
      {
        onSuccess: () => {
          toast.success("Metric assigned to role");
          onAssign?.();
        },
      },
    );
  };

  const handleConfirmReplace = () => {
    if (!confirmDialog) return;
    updateRole.mutate(
      { id: confirmDialog.roleId, metricId },
      {
        onSuccess: () => {
          toast.success("Metric assigned to role");
          onAssign?.();
        },
      },
    );
    setConfirmDialog(null);
  };

  return (
    <>
      <div className="space-y-1">
        {isLoadingRoles ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : !teamRoles || teamRoles.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center rounded-lg border border-dashed p-4 text-center">
            <Users className="text-muted-foreground mb-2 h-5 w-5" />
            <span className="text-xs">No roles in this team</span>
          </div>
        ) : isAtLimit ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
            <Users className="h-4 w-4" />
            <span>Maximum {MAX_ROLES_PER_METRIC} roles per metric reached</span>
          </div>
        ) : (
          <Select
            value=""
            onValueChange={handleRoleSelect}
            disabled={updateRole.isPending}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select a role to add..." />
            </SelectTrigger>
            <SelectContent>
              {teamRoles
                .filter((role) => !assignedRoleIds.includes(role.id))
                .map((role) => {
                  const userName = getUserName(role.assignedUserId, members);
                  const hasOtherMetric =
                    role.metricId && role.metricId !== metricId;

                  return (
                    <SelectItem
                      key={role.id}
                      value={role.id}
                      className="text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="font-medium">{role.title}</span>
                        {role.assignedUserId && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground truncate text-[10px]">
                              {userName ?? "Assigned"}
                            </span>
                          </>
                        )}
                        {role.effortPoints && role.effortPoints > 0 && (
                          <Badge
                            variant="secondary"
                            className="h-4 gap-0.5 px-1 text-[9px]"
                          >
                            <Gauge className="h-2.5 w-2.5" />
                            {role.effortPoints}
                          </Badge>
                        )}
                        {hasOtherMetric && (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground ml-auto h-4 px-1 text-[9px]"
                          >
                            Has metric
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              {teamRoles.filter((role) => !assignedRoleIds.includes(role.id))
                .length === 0 && (
                <div className="text-muted-foreground px-2 py-4 text-center text-xs">
                  All roles have been assigned
                </div>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <AlertDialog
        open={confirmDialog?.open}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              Replace existing metric?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The role <strong>{confirmDialog?.roleTitle}</strong> is currently
              tracking <strong>{confirmDialog?.existingMetricName}</strong>.
              <br />
              <br />
              Assigning <strong>{metricName}</strong> will replace the existing
              metric assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
