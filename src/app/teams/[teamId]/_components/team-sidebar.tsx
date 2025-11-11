"use client";

import { type ComponentProps, useState } from "react";

import type { User } from "@workos-inc/node";
import { Loader2, Mail, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import { useTeamStore } from "../store/team-store";
import { CreateRoleDialog } from "./role-dialog";

interface TeamSidebarProps extends ComponentProps<typeof Sidebar> {
  teamId: string;
  teamName: string;
  teamDescription?: string | null;
  roleCount: number;
}

function MemberCard({
  user,
  roleCount,
}: {
  user: User | Record<string, unknown>;
  roleCount: number;
}) {
  const userObj = user as Record<string, unknown>;
  const firstName = userObj.firstName as string | null | undefined;
  const lastName = userObj.lastName as string | null | undefined;
  const email = userObj.email as string | null | undefined;

  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : (email?.[0]?.toUpperCase() ?? "U");

  const userName =
    firstName && lastName ? `${firstName} ${lastName}` : (email ?? "Member");

  return (
    <div className="bg-card hover:bg-accent/50 flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors">
      <div className="flex items-center gap-3 overflow-hidden">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-medium">
            {userName}
          </p>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{email ?? "No email"}</span>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0">
        <Badge
          variant="secondary"
          className="min-w-[2rem] justify-center text-xs font-semibold"
        >
          {roleCount}
        </Badge>
      </div>
    </div>
  );
}

function RolesList({ teamId }: { teamId: string }) {
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  const nodes = useTeamStore((state) => state.nodes);
  const setNodes = useTeamStore((state) => state.setNodes);
  const markDirty = useTeamStore((state) => state.markDirty);

  const utils = api.useUtils();
  const deleteRole = api.role.delete.useMutation({
    onMutate: async (variables) => {
      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return [];
        return old.filter((role) => role.id !== variables.id);
      });

      const updatedNodes = nodes.filter(
        (node) => node.data.roleId !== variables.id,
      );
      setNodes(updatedNodes);
      markDirty();

      return { previousRoles };
    },
    onError: (error, variables, context) => {
      if (context?.previousRoles) {
        utils.role.getByTeam.setData({ teamId }, context.previousRoles);
      }
    },
    onSettled: () => {
      setDeletingRoleId(null);
    },
  });

  const { data: roles, isLoading } = api.role.getByTeam.useQuery({ teamId });

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!roles || roles.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
        <p className="text-sm font-medium">No roles yet</p>
        <p className="text-xs">Create your first role to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {roles.map((role) => {
        const isPending = Boolean(
          "isPending" in role && (role as { isPending?: boolean }).isPending,
        );

        return (
          <div
            key={role.id}
            className={cn(
              "group bg-card hover:bg-accent/50 relative flex items-start gap-3 overflow-hidden rounded-lg border p-3 transition-colors",
              isPending && "opacity-60",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="border-background h-3 w-3 flex-shrink-0 rounded-full border-2 shadow-sm"
                  style={{
                    backgroundColor: role.color,
                    boxShadow: `0 0 0 1px ${role.color}40`,
                  }}
                  aria-label={`Role color: ${role.color}`}
                />
                <h4 className="truncate text-sm leading-tight font-semibold">
                  {role.title}
                </h4>
                {isPending && (
                  <div className="flex items-center gap-1">
                    <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
                    <div
                      className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-relaxed">
                {role.purpose}
              </p>
              {role.metric && (
                <Badge
                  variant="outline"
                  className="border-primary/20 mt-2 max-w-full text-xs font-medium"
                >
                  <span className="truncate">{role.metric.name}</span>
                </Badge>
              )}
              {isPending && (
                <p className="text-muted-foreground mt-1 text-xs italic">
                  Saving...
                </p>
              )}
            </div>
            {!isPending && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 flex-shrink-0 opacity-0 transition-all group-hover:opacity-100"
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete the role "${role.title}"? This will also remove it from the canvas.`,
                    )
                  ) {
                    setDeletingRoleId(role.id);
                    deleteRole.mutate({ id: role.id });
                  }
                }}
                disabled={deletingRoleId === role.id}
                aria-label={`Delete ${role.title}`}
              >
                {deletingRoleId === role.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TeamSidebar({
  teamId,
  teamName,
  teamDescription,
  roleCount,
  ...props
}: TeamSidebarProps) {
  const { data: members, isLoading: membersLoading } =
    api.organization.getCurrentOrgMembers.useQuery();

  const { data: teamRoles } = api.role.getByTeam.useQuery({ teamId });

  const roleCountByUser = (teamRoles ?? []).reduce(
    (acc, role) => {
      if (role.assignedUserId) {
        acc[role.assignedUserId] = (acc[role.assignedUserId] ?? 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Sidebar
      side="right"
      collapsible="offcanvas"
      className="bg-sidebar border-l"
      style={
        {
          "--sidebar-width": "24rem",
        } as React.CSSProperties
      }
      {...props}
    >
      <SidebarHeader className="border-b px-6 py-4">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{teamName}</h2>
            {teamDescription && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">
                {teamDescription}
              </p>
            )}
          </div>
          <CreateRoleDialog teamId={teamId} />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {/* Team Info */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground px-4 text-xs font-semibold tracking-wider uppercase">
            Team Info
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-4 py-2">
              <div className="bg-card flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-muted-foreground text-sm font-medium">
                  Total Roles
                </span>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {roleCount}
                </Badge>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Organization Members */}
        <SidebarGroup>
          <div className="px-4">
            <div className="flex items-center justify-between">
              <SidebarGroupLabel className="text-muted-foreground px-0 text-xs font-semibold tracking-wider uppercase">
                Team Members
              </SidebarGroupLabel>
              {members && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {members.length}
                </Badge>
              )}
            </div>
          </div>
          <SidebarGroupContent>
            <div className="space-y-2 px-4 py-2">
              {membersLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </>
              ) : !members || members.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center">
                  <p className="text-xs">No members found</p>
                </div>
              ) : (
                members.map((member) => (
                  <MemberCard
                    key={member.membership.id}
                    user={member.user}
                    roleCount={roleCountByUser[member.user.id] ?? 0}
                  />
                ))
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Roles List */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground px-4 text-xs font-semibold tracking-wider uppercase">
            Roles
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-4 py-2">
              <RolesList teamId={teamId} />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
