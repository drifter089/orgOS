"use client";

import { Users } from "lucide-react";

import { RoleAssignment } from "@/components/metric/role-assignment";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface RoleTabContentProps {
  metricId: string;
  metricName: string;
  teamId: string | null;
  roles: Array<{
    id: string;
    title: string;
    color: string;
    assignedUserId: string | null;
    assignedUserName: string | null;
  }>;
}

export function RoleTabContent({
  metricId,
  metricName,
  teamId,
  roles,
}: RoleTabContentProps) {
  if (!teamId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <Users className="text-muted-foreground mb-2 h-8 w-8" />
        <p className="text-muted-foreground text-center text-sm">
          This metric is not linked to a team
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <h3 className="mb-4 text-sm font-semibold">Assigned Roles</h3>

      {/* Existing role labels */}
      {roles.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {roles.map((role) => (
            <Badge
              key={role.id}
              variant="outline"
              className="flex items-center gap-1.5 py-1"
              style={{ borderColor: role.color }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: role.color }}
              />
              <span>{role.title}</span>
              {role.assignedUserName && (
                <span className="text-muted-foreground text-[10px]">
                  {role.assignedUserName}
                </span>
              )}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground mb-4 rounded-lg border border-dashed p-4 text-center text-sm">
          No roles assigned yet
        </div>
      )}

      {/* Assign Role dropdown */}
      <div className="space-y-2">
        <Label className="text-xs">Assign Role</Label>
        <RoleAssignment
          metricId={metricId}
          metricName={metricName}
          teamId={teamId}
          assignedRoleIds={roles.map((r) => r.id)}
        />
      </div>
    </div>
  );
}
