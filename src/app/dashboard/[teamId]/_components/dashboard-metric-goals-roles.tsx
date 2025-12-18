"use client";

import { useState } from "react";

import type { Role } from "@prisma/client";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Check,
  Gauge,
  Loader2,
  Pencil,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/trpc/react";

interface DashboardMetricGoalsRolesProps {
  metricId: string;
  metricName: string;
  roles: Role[];
}

type GoalType = "ABSOLUTE" | "RELATIVE";
type GoalPeriod = "WEEKLY" | "MONTHLY";

// Helper to get user name from members list
function getUserName(
  userId: string | null,
  members:
    | Array<{ id: string; firstName: string | null; lastName: string | null }>
    | undefined,
): string | null {
  if (!userId || !members) return null;
  const member = members.find((m) => m.id === userId);
  if (!member) return null;
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || null;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "exceeded":
      return {
        label: "Exceeded",
        variant: "default" as const,
        icon: <Check className="h-3 w-3" />,
      };
    case "on_track":
      return {
        label: "On Track",
        variant: "secondary" as const,
        icon: <TrendingUp className="h-3 w-3" />,
      };
    case "at_risk":
      return {
        label: "At Risk",
        variant: "destructive" as const,
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    default:
      return {
        label: "No Data",
        variant: "outline" as const,
        icon: <Target className="h-3 w-3" />,
      };
  }
}

export function DashboardMetricGoalsRoles({
  metricId,
  metricName,
  roles,
}: DashboardMetricGoalsRolesProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id ?? "",
  );
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const [isEditing, setIsEditing] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("ABSOLUTE");
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("WEEKLY");
  const [targetValue, setTargetValue] = useState("");

  const utils = api.useUtils();
  const { data: members } = api.organization.getMembers.useQuery();

  const { data: goalData, isLoading: isGoalLoading } =
    api.metric.getGoal.useQuery({ metricId });

  const upsertGoalMutation = api.metric.upsertGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal saved");
      setIsEditing(false);
      void utils.metric.getGoal.invalidate({ metricId });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGoalMutation = api.metric.deleteGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal deleted");
      void utils.metric.getGoal.invalidate({ metricId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveGoal = () => {
    const value = parseFloat(targetValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    upsertGoalMutation.mutate({
      metricId,
      goalType,
      goalPeriod,
      targetValue: value,
    });
  };

  const handleEditGoal = () => {
    if (goalData?.goal) {
      setGoalType(goalData.goal.goalType);
      setGoalPeriod(goalData.goal.goalPeriod);
      setTargetValue(String(goalData.goal.targetValue));
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTargetValue("");
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="shrink-0 space-y-0 px-4 pt-2 pb-1">
        <CardTitle className="truncate text-sm font-medium">
          {metricName}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 px-4 pt-0 pb-3">
        <div className="shrink-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <Users className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Assigned Roles
            </span>
            {roles.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-auto h-4 px-1 text-[10px]"
              >
                {roles.length}
              </Badge>
            )}
          </div>

          {roles.length > 0 ? (
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="h-auto min-h-[32px] py-1.5 text-xs">
                <SelectValue placeholder="Select a role">
                  {selectedRole && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: selectedRole.color }}
                      />
                      <span className="truncate font-medium">
                        {selectedRole.title}
                      </span>
                      {selectedRole.assignedUserId && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground truncate">
                            {getUserName(
                              selectedRole.assignedUserId,
                              members,
                            ) ?? "Assigned"}
                          </span>
                        </>
                      )}
                      {selectedRole.effortPoints &&
                        selectedRole.effortPoints > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-4 gap-0.5 px-1 text-[9px]"
                          >
                            <Gauge className="h-2.5 w-2.5" />
                            {selectedRole.effortPoints}
                          </Badge>
                        )}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => {
                  const userName = getUserName(role.assignedUserId, members);
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
                            className="ml-auto h-4 gap-0.5 px-1 text-[9px]"
                          >
                            <Gauge className="h-2.5 w-2.5" />
                            {role.effortPoints}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-muted-foreground rounded border border-dashed p-1.5 text-center text-[10px]">
              No roles assigned
            </div>
          )}
        </div>

        <Separator className="my-0.5" />

        <div className="flex flex-1 flex-col space-y-1.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <Target className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Goal Target
            </span>
          </div>

          {isGoalLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          ) : isEditing || !goalData?.goal ? (
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px]">Type</span>
                <ToggleGroup
                  type="single"
                  value={goalType}
                  onValueChange={(v) => v && setGoalType(v as GoalType)}
                  className="grid w-full grid-cols-2 gap-0 rounded-md border"
                >
                  <ToggleGroupItem
                    value="ABSOLUTE"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 rounded-none rounded-l-md border-r text-[10px]"
                  >
                    Absolute
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="RELATIVE"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 rounded-none rounded-r-md text-[10px]"
                  >
                    Relative %
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px]">
                  Period
                </span>
                <ToggleGroup
                  type="single"
                  value={goalPeriod}
                  onValueChange={(v) => v && setGoalPeriod(v as GoalPeriod)}
                  className="grid w-full grid-cols-2 gap-0 rounded-md border"
                >
                  <ToggleGroupItem
                    value="WEEKLY"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 rounded-none rounded-l-md border-r text-[10px]"
                  >
                    Weekly
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="MONTHLY"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 rounded-none rounded-r-md text-[10px]"
                  >
                    Monthly
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <Input
                type="number"
                placeholder={
                  goalType === "RELATIVE" ? "Growth %" : "Target value"
                }
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="h-7 text-xs"
              />

              <div className="mt-auto flex gap-1.5">
                {goalData?.goal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-7 flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveGoal}
                  disabled={upsertGoalMutation.isPending || !targetValue}
                  className="h-7 flex-1 text-xs"
                >
                  {upsertGoalMutation.isPending && (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="rounded border p-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize">
                    {goalData.goal.goalPeriod.toLowerCase()} goal
                  </span>
                  <Badge
                    variant={getStatusConfig(goalData.progress.status).variant}
                    className="h-4 gap-0.5 px-1 text-[10px]"
                  >
                    {getStatusConfig(goalData.progress.status).icon}
                    {getStatusConfig(goalData.progress.status).label}
                  </Badge>
                </div>

                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground text-[10px]">
                      Progress
                    </p>
                    <p className="text-sm font-semibold">
                      {Math.round(goalData.progress.progressPercent)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">Target</p>
                    <p className="text-sm font-semibold">
                      {goalData.goal.goalType === "ABSOLUTE"
                        ? goalData.goal.targetValue.toLocaleString()
                        : `+${goalData.goal.targetValue}%`}
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
                  <Calendar className="h-2.5 w-2.5" />
                  {goalData.progress.daysRemaining}d left •{" "}
                  {format(new Date(goalData.progress.periodEnd), "MMM d")}
                </p>
              </div>

              <div className="mt-auto flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditGoal}
                  className="h-7 flex-1 text-xs"
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteGoalMutation.mutate({ metricId })}
                  disabled={deleteGoalMutation.isPending}
                  className="h-7 w-7 p-0"
                >
                  {deleteGoalMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
