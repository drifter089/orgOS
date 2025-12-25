"use client";

import { useState } from "react";

import { Pencil, Target, User, Users } from "lucide-react";

import { RoleAssignment } from "@/components/metric/role-assignment";
import { RoleEditDialog } from "@/components/role/role-edit-dialog";
import { Button } from "@/components/ui/button";
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
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="mb-5">
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
            <div
              key={role.id}
              className="bg-background group border p-3 shadow-sm"
              style={{ borderLeftColor: role.color, borderLeftWidth: 3 }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center"
                  style={{ backgroundColor: `${role.color}20` }}
                >
                  <Target className="h-4 w-4" style={{ color: role.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{role.title}</div>
                  {role.assignedUserName ? (
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                      <User className="h-3 w-3" />
                      {role.assignedUserName}
                    </div>
                  ) : (
                    <div className="text-muted-foreground mt-0.5 text-xs italic">
                      Unassigned
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setEditingRoleId(role.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-muted/20 mb-4 flex flex-col items-center border border-dashed p-6 text-center">
          <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center">
            <Users className="text-muted-foreground h-6 w-6" />
          </div>
          <p className="text-muted-foreground text-sm">No roles assigned yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Use the dropdown below to assign roles
          </p>
        </div>
      )}

      {/* Assign Role dropdown */}
      <div className="space-y-2">
        <Label className="text-xs">Add Role</Label>
        <RoleAssignment
          metricId={metricId}
          metricName={metricName}
          teamId={teamId}
          assignedRoleIds={roles.map((r) => r.id)}
        />
      </div>

      {editingRoleId && (
        <RoleEditDialog
          teamId={teamId}
          roleId={editingRoleId}
          open={!!editingRoleId}
          onOpenChange={(open) => {
            if (!open) setEditingRoleId(null);
          }}
        />
      )}
    </div>
  );
}
