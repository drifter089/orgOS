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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            ASSIGN TO ROLE
          </span>
          {assignedRoleIds.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-auto h-4 rounded-none px-1.5 text-[9px] font-bold"
            >
              {assignedRoleIds.length}
            </Badge>
          )}
        </div>

        {isLoadingRoles ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : !teamRoles || teamRoles.length === 0 ? (
          <div className="text-muted-foreground border-foreground/10 border border-dashed p-2 text-center text-[10px] tracking-wider uppercase">
            NO ROLES IN THIS TEAM
          </div>
        ) : (
          <Select
            value={assignedRole?.id ?? ""}
            onValueChange={handleRoleSelect}
            disabled={updateRoleMutation.isPending}
          >
            <SelectTrigger className="border-foreground/10 h-9 min-h-[36px] rounded-none py-1.5 text-xs">
              <SelectValue placeholder="SELECT A ROLE TO ASSIGN">
                {assignedRole && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: assignedRole.color }}
                    />
                    <span className="truncate font-bold tracking-wide uppercase">
                      {assignedRole.title}
                    </span>
                    {assignedRole.assignedUserId && (
                      <>
                        <span className="text-muted-foreground/50 text-[10px]">
                          |
                        </span>
                        <span className="text-muted-foreground truncate text-[10px] tracking-wider uppercase">
                          {getUserName(assignedRole.assignedUserId, members) ??
                            "ASSIGNED"}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="border-foreground/10 rounded-none">
              {teamRoles.map((role) => {
                const userName = getUserName(role.assignedUserId, members);
                const isAssigned = assignedRoleIds.includes(role.id);
                const hasOtherMetric =
                  role.metricId && role.metricId !== metricId;

                return (
                  <SelectItem
                    key={role.id}
                    value={role.id}
                    className="focus:bg-muted rounded-none text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="font-bold tracking-wide uppercase">
                        {role.title}
                      </span>
                      {role.assignedUserId && (
                        <>
                          <span className="text-muted-foreground/50 text-[10px]">
                            |
                          </span>
                          <span className="text-muted-foreground truncate text-[9px] tracking-wider uppercase">
                            {userName ?? "ASSIGNED"}
                          </span>
                        </>
                      )}
                      {role.effortPoints && role.effortPoints > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-4 gap-0.5 rounded-none px-1 text-[9px] font-bold"
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
                          className="text-muted-foreground border-foreground/10 ml-auto h-4 rounded-none px-1 text-[9px] tracking-wider uppercase"
                        >
                          HAS METRIC
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
        <AlertDialogContent className="border-foreground/10 rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
              <AlertTriangle className="text-destructive h-4 w-4" />
              REPLACE EXISTING METRIC?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              The role{" "}
              <strong className="text-foreground uppercase">
                {confirmDialog?.roleTitle}
              </strong>{" "}
              is currently tracking{" "}
              <strong className="text-foreground uppercase">
                {confirmDialog?.existingMetricName}
              </strong>
              .
              <br />
              <br />
              Assigning{" "}
              <strong className="text-foreground uppercase">
                {metricName}
              </strong>{" "}
              will replace the existing metric assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-foreground/10 rounded-none text-xs font-bold tracking-widest uppercase">
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReplace}
              className="rounded-none text-xs font-bold tracking-widest uppercase"
            >
              REPLACE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
