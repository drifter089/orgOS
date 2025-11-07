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
import { api } from "@/trpc/react";

import { useTeamStore } from "../store/team-store";
import { CreateRoleDialog } from "./role-dialog";

interface TeamSidebarProps extends ComponentProps<typeof Sidebar> {
  teamId: string;
  teamName: string;
  teamDescription?: string | null;
  roleCount: number;
}

function MemberCard({ user, userId }: { user: User; userId: string }) {
  const { data: roles, isLoading } = api.role.getByUser.useQuery({
    userId,
  });

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user.email?.[0]?.toUpperCase() ?? "U");

  const userName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user.email ?? "Member");

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
            <span className="truncate">{user.email ?? "No email"}</span>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0">
        {isLoading ? (
          <Skeleton className="h-5 w-9" />
        ) : (
          <Badge
            variant="secondary"
            className="min-w-[2rem] justify-center text-xs font-semibold"
          >
            {roles?.length ?? 0}
          </Badge>
        )}
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
    onSuccess: async (_, variables) => {
      // Remove the node from the canvas
      const updatedNodes = nodes.filter(
        (node) => node.data.roleId !== variables.id,
      );
      setNodes(updatedNodes);
      markDirty();

      // Invalidate roles query to refresh the list
      // Note: We don't invalidate team.getById here to avoid race condition with canvas state
      // The auto-save will handle updating the canvas state on the server
      await utils.role.getByTeam.invalidate({ teamId });
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
      {roles.map((role) => (
        <div
          key={role.id}
          className="group bg-card hover:bg-accent/50 relative flex items-start gap-3 rounded-lg border p-3 transition-colors"
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
            </div>
            <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-relaxed">
              {role.purpose}
            </p>
            {role.metric && (
              <Badge
                variant="outline"
                className="border-primary/20 mt-2 text-xs font-medium"
              >
                {role.metric.name}
              </Badge>
            )}
          </div>
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
        </div>
      ))}
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
          <SidebarGroupLabel className="text-muted-foreground px-4 text-xs font-semibold tracking-wider uppercase">
            <div className="flex items-center justify-between">
              <span>Team Members</span>
              {members && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {members.length}
                </Badge>
              )}
            </div>
          </SidebarGroupLabel>
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
                    userId={member.user.id}
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
