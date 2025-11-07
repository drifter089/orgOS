"use client";

import type { User } from "@workos-inc/node";
import { Briefcase, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

interface UserRolesDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRolesDialog({
  user,
  isOpen,
  onOpenChange,
}: UserRolesDialogProps) {
  const { data: roles, isLoading } = api.role.getByUser.useQuery(
    { userId: user?.id ?? "" },
    { enabled: isOpen && !!user?.id },
  );

  const userName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user?.email ?? "User");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Assigned Roles
          </DialogTitle>
          <DialogDescription>
            Viewing roles assigned to <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-4">
          {isLoading ? (
            // Loading state
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 rounded-lg border p-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : !roles || roles.length === 0 ? (
            // Empty state
            <div className="text-muted-foreground py-8 text-center">
              <Briefcase className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="font-medium">No roles assigned</p>
              <p className="mt-1 text-sm">
                This user has not been assigned to any roles yet.
              </p>
            </div>
          ) : (
            // Roles list
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="hover:bg-muted/50 space-y-3 rounded-lg border p-4 transition-colors"
                >
                  {/* Team Badge */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Team: {role.team.name}
                    </Badge>
                    <div
                      className="border-border h-3 w-3 rounded-full border"
                      style={{ backgroundColor: role.color }}
                      title={`Role color: ${role.color}`}
                      aria-label={`Role color indicator`}
                    />
                  </div>

                  {/* Role Title */}
                  <div>
                    <h4 className="text-lg font-semibold">{role.title}</h4>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {role.purpose}
                    </p>
                  </div>

                  {/* Metric Information */}
                  {role.metric && (
                    <div className="bg-muted/50 space-y-2 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-primary h-4 w-4" />
                        <span className="text-sm font-medium">
                          KPI: {role.metric.name}
                        </span>
                      </div>
                      {role.metric.description && (
                        <p className="text-muted-foreground text-xs">
                          {role.metric.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        {role.metric.currentValue !== null && (
                          <span>
                            <strong>Current:</strong> {role.metric.currentValue}
                            {role.metric.unit}
                          </span>
                        )}
                        {role.metric.targetValue !== null && (
                          <span>
                            <strong>Target:</strong> {role.metric.targetValue}
                            {role.metric.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {roles && roles.length > 0 && (
          <>
            <Separator />
            <div className="text-muted-foreground text-center text-sm">
              Total: {roles.length} {roles.length === 1 ? "role" : "roles"}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
