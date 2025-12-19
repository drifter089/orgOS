"use client";

import type { Role } from "@prisma/client";

import { GoalEditor } from "@/components/metric/goal-editor";
import { RoleAssignment } from "@/components/metric/role-assignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface DashboardMetricGoalsRolesProps {
  metricId: string;
  metricName: string;
  teamId: string;
  roles: Role[];
}

export function DashboardMetricGoalsRoles({
  metricId,
  metricName,
  teamId,
  roles,
}: DashboardMetricGoalsRolesProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="shrink-0 space-y-0 px-4 pt-2 pb-1">
        <CardTitle className="truncate text-sm font-medium">
          {metricName}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 px-4 pt-0 pb-3">
        {/* Role Assignment - now shows all team roles */}
        <RoleAssignment
          metricId={metricId}
          metricName={metricName}
          teamId={teamId}
          assignedRoleIds={roles.map((r) => r.id)}
        />

        <Separator className="my-0.5" />

        {/* Goal Editor - reusable component */}
        <div className="flex flex-1 flex-col">
          <GoalEditor metricId={metricId} />
        </div>
      </CardContent>
    </Card>
  );
}
