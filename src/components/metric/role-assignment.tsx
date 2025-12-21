"use client";

import { useState } from "react";

import { AlertTriangle, Check, Gauge, Loader2, Users } from "lucide-react";
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
import { getUserName } from "@/lib/helpers/get-user-name";
import { api } from "@/trpc/react";

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

  const utils = api.useUtils();
  const { data: members } = api.organization.getMembers.useQuery();

  // Fetch all roles in the team
  const { data: teamRoles, isLoading: isLoadingRoles } =
    api.role.getByTeamId.useQuery({ teamId });

  const updateRoleMutation = api.role.update.useMutation({
    onSuccess: () => {
      toast.success("Metric assigned to role");
      void utils.role.getByTeamId.invalidate({ teamId });
      void utils.dashboard.getDashboardCharts.invalidate();
      onAssign?.();
    },
    onError: (err) => toast.error(err.message),
  });

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
    updateRoleMutation.mutate({ id: roleId, metricId });
  };

  const handleConfirmReplace = () => {
    if (!confirmDialog) return;
    updateRoleMutation.mutate({ id: confirmDialog.roleId, metricId });
    setConfirmDialog(null);
  };

  // Get the currently assigned role (if any)
  const assignedRole = teamRoles?.find((r) => assignedRoleIds.includes(r.id));

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-500">
            Assign to Role
          </span>
          {assignedRoleIds.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-auto h-4 rounded-md px-1.5 text-[9px] font-bold"
            >
              {assignedRoleIds.length}
            </Badge>
          )}
        </div>

        {isLoadingRoles ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : !teamRoles || teamRoles.length === 0 ? (
          <div className="dark:border-border rounded-lg border border-dashed border-gray-200 p-2 text-center text-xs text-gray-500">
            No roles in this team
          </div>
        ) : (
          <Select
            value={assignedRole?.id ?? ""}
            onValueChange={handleRoleSelect}
            disabled={updateRoleMutation.isPending}
          >
            <SelectTrigger className="dark:border-border h-9 min-h-[36px] rounded-lg border-gray-200 py-1.5 text-xs">
              <SelectValue placeholder="Select a role to assign">
                {assignedRole && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: assignedRole.color }}
                    />
                    <span className="truncate font-medium">
                      {assignedRole.title}
                    </span>
                    {assignedRole.assignedUserId && (
                      <>
                        <span className="text-gray-400">|</span>
                        <span className="truncate text-gray-500">
                          {getUserName(assignedRole.assignedUserId, members) ??
                            "Assigned"}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="dark:border-border rounded-lg border-gray-200">
              {teamRoles.map((role) => {
                const userName = getUserName(role.assignedUserId, members);
                const isAssigned = assignedRoleIds.includes(role.id);
                const hasOtherMetric =
                  role.metricId && role.metricId !== metricId;

                return (
                  <SelectItem
                    key={role.id}
                    value={role.id}
                    className="dark:focus:bg-muted rounded-md text-xs focus:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="font-medium">{role.title}</span>
                      {role.assignedUserId && (
                        <>
                          <span className="text-gray-400">|</span>
                          <span className="truncate text-gray-500">
                            {userName ?? "Assigned"}
                          </span>
                        </>
                      )}
                      {role.effortPoints && role.effortPoints > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-4 gap-0.5 rounded px-1 text-[9px]"
                        >
                          <Gauge className="h-2.5 w-2.5" />
                          {role.effortPoints}
                        </Badge>
                      )}
                      {isAssigned && (
                        <Check className="text-primary ml-auto h-3 w-3" />
                      )}
                      {hasOtherMetric && !isAssigned && (
                        <Badge
                          variant="outline"
                          className="ml-auto h-4 rounded px-1 text-[9px] text-gray-500"
                        >
                          Has metric
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      <AlertDialog
        open={confirmDialog?.open}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Replace existing metric?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The role{" "}
              <strong className="dark:text-foreground text-gray-900">
                {confirmDialog?.roleTitle}
              </strong>{" "}
              is currently tracking{" "}
              <strong className="dark:text-foreground text-gray-900">
                {confirmDialog?.existingMetricName}
              </strong>
              .
              <br />
              <br />
              Assigning{" "}
              <strong className="dark:text-foreground text-gray-900">
                {metricName}
              </strong>{" "}
              will replace the existing metric assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReplace}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
