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
    api.role.getByTeam.useQuery({ teamId });

  const updateRoleMutation = api.role.update.useMutation({
    onSuccess: () => {
      toast.success("Metric assigned to role");
      void utils.role.getByTeam.invalidate({ teamId });
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
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Users className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Assign to Role
          </span>
          {assignedRoleIds.length > 0 && (
            <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
              {assignedRoleIds.length}
            </Badge>
          )}
        </div>

        {isLoadingRoles ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : !teamRoles || teamRoles.length === 0 ? (
          <div className="text-muted-foreground rounded border border-dashed p-1.5 text-center text-[10px]">
            No roles in this team
          </div>
        ) : (
          <Select
            value={assignedRole?.id ?? ""}
            onValueChange={handleRoleSelect}
            disabled={updateRoleMutation.isPending}
          >
            <SelectTrigger className="h-auto min-h-[32px] py-1.5 text-xs">
              <SelectValue placeholder="Select a role to assign">
                {assignedRole && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: assignedRole.color }}
                    />
                    <span className="truncate font-medium">
                      {assignedRole.title}
                    </span>
                    {assignedRole.assignedUserId && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground truncate">
                          {getUserName(assignedRole.assignedUserId, members) ??
                            "Assigned"}
                        </span>
                      </>
                    )}
                    <Check className="text-primary ml-auto h-3 w-3" />
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {teamRoles.map((role) => {
                const userName = getUserName(role.assignedUserId, members);
                const isAssigned = assignedRoleIds.includes(role.id);
                const hasOtherMetric =
                  role.metricId && role.metricId !== metricId;

                return (
                  <SelectItem key={role.id} value={role.id} className="text-xs">
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
                      {isAssigned && (
                        <Check className="text-primary ml-auto h-3 w-3" />
                      )}
                      {hasOtherMetric && !isAssigned && (
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
