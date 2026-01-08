"use client";

import { useState } from "react";

import { Users } from "lucide-react";

import { RoleAssignment } from "@/components/metric/role-assignment";
import { RoleCard } from "@/components/role/role-card";
import { RoleDialog } from "@/components/role/role-dialog";
import { Label } from "@/components/ui/label";

interface RoleTabContentProps {
  metricId: string;
  metricName: string;
  teamId: string | null;
  roles: Array<{
    id: string;
    title: string;
    color: string;
    purpose?: string;
    effortPoints?: number | null;
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
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  if (!teamId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center">
          <Users className="text-muted-foreground h-8 w-8" />
        </div>
        <p className="text-muted-foreground text-center text-sm">
          This metric is not linked to a team
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold">Assigned Roles</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Assign team roles responsible for this metric. Each role can have a
          member accountable for tracking progress.
        </p>
      </div>

      {/* Existing roles as cards */}
      {roles.length > 0 ? (
        <div className="mb-4 space-y-3">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={{
                id: role.id,
                title: role.title,
                color: role.color,
                purpose: role.purpose ?? "",
                effortPoints: role.effortPoints,
                assignedUserId: role.assignedUserId,
                assignedUserName: role.assignedUserName,
              }}
              teamId={teamId}
              variant="list"
              onEdit={() => setEditingRoleId(role.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-muted/20 mb-4 flex items-center gap-4 border border-dashed p-4">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center">
            <Users className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              No roles assigned yet
            </p>
            <p className="text-muted-foreground text-xs">
              Use the dropdown below to assign
            </p>
          </div>
        </div>
      )}

      {/* Assign Role dropdown */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Add Role</Label>
        <RoleAssignment
          metricId={metricId}
          metricName={metricName}
          teamId={teamId}
          assignedRoleIds={roles.map((r) => r.id)}
        />
      </div>

      {editingRoleId && (
        <RoleDialog
          teamId={teamId}
          roleData={{ roleId: editingRoleId }}
          open={!!editingRoleId}
          onOpenChange={(open) => {
            if (!open) setEditingRoleId(null);
          }}
        />
      )}
    </div>
  );
}
