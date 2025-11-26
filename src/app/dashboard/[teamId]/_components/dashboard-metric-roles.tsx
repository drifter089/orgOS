"use client";

import { useState } from "react";

import type { Role } from "@prisma/client";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardMetricRolesProps {
  title: string;
  roles: Role[];
}

export function DashboardMetricRoles({
  title,
  roles,
}: DashboardMetricRolesProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id ?? "",
  );

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2 pr-24">
          <CardTitle className="truncate text-lg">Assigned Roles</CardTitle>
        </div>
        <p className="text-muted-foreground text-xs">Metric: {title}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden pt-0">
        {roles.length > 0 ? (
          <>
            <div className="flex-shrink-0 space-y-1">
              <label className="text-sm font-medium">Select Role</label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        {role.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRole && (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex-1 space-y-2 overflow-auto rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: selectedRole.color }}
                    />
                    <h3 className="truncate font-medium">
                      {selectedRole.title}
                    </h3>
                    {selectedRole.assignedUserId && (
                      <Badge
                        variant="secondary"
                        className="flex-shrink-0 text-xs"
                      >
                        Assigned
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Purpose
                    </p>
                    <p className="line-clamp-4 text-sm">
                      {selectedRole.purpose}
                    </p>
                  </div>
                </div>

                <div className="text-muted-foreground flex-shrink-0 text-xs">
                  {roles.length} role{roles.length !== 1 ? "s" : ""} tracking
                  this metric
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed p-4 text-center">
            <Users className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm font-medium">
              No roles assigned
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              This metric is not assigned to any roles yet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
