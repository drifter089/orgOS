"use client";

import { useState } from "react";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, ChevronRight, Loader2, Mail, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import { api } from "@/trpc/react";

import { useDeleteRole } from "../hooks/use-delete-role";
import { useTeamStore } from "../store/team-store";
import { RoleDialog } from "./role-dialog";
import { type RoleNodeData } from "./role-node";
import { TeamSheetEdgeTrigger } from "./team-sheet-edge-trigger";

/**
 * Custom sheet content without modal overlay
 * Used for non-modal sidebar that allows canvas interaction
 */
function NonModalSheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Content
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-40 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full border-l",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full border-r",
          className,
        )}
        {...props}
      >
        {/* Hidden title for accessibility */}
        <SheetPrimitive.Title className="sr-only">
          Team Sidebar
        </SheetPrimitive.Title>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

interface TeamSheetSidebarProps {
  teamId: string;
  teamName: string;
  teamDescription?: string | null;
  roleCount: number;
}

interface MemberProps {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

function MemberCard({
  member,
  roleCount,
}: {
  member: MemberProps;
  roleCount: number;
}) {
  const initials =
    member.firstName && member.lastName
      ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
      : (member.email?.[0]?.toUpperCase() ?? "U");

  const userName =
    member.firstName && member.lastName
      ? `${member.firstName} ${member.lastName}`
      : (member.email ?? "Member");

  return (
    <div className="bg-card hover:bg-accent/50 flex items-center justify-between gap-3 rounded-lg border p-3 shadow-sm transition-colors hover:shadow">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
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
            <span className="truncate">{member.email ?? "No email"}</span>
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

function RolesList({
  teamId,
  onRoleClick,
}: {
  teamId: string;
  onRoleClick?: (roleId: string) => void;
}) {
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  const { confirm } = useConfirmation();
  const deleteRoleMutation = useDeleteRole(teamId);

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
              "group bg-card hover:bg-accent/50 relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-lg border p-3 shadow-sm transition-all hover:shadow",
              isPending && "opacity-60",
            )}
            onClick={() => !isPending && onRoleClick?.(role.id)}
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
                onClick={async (e) => {
                  e.stopPropagation();
                  const confirmed = await confirm({
                    title: "Delete role",
                    description: `Are you sure you want to delete "${role.title}"? This will also remove it from the canvas.`,
                    confirmText: "Delete",
                    variant: "destructive",
                  });

                  if (confirmed) {
                    setDeletingRoleId(role.id);
                    deleteRoleMutation.mutate(
                      { id: role.id },
                      { onSettled: () => setDeletingRoleId(null) },
                    );
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

/**
 * Sheet-based sidebar for team management
 * Closed by default to allow data prefetching while user interacts with canvas
 */
export function TeamSheetSidebar({
  teamId,
  teamName: _teamName,
  teamDescription: _teamDescription,
  roleCount,
}: TeamSheetSidebarProps) {
  // Closed by default to allow data prefetching
  const [isOpen, setIsOpen] = useState(false);
  const [teamMembersExpanded, setTeamMembersExpanded] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: members, isLoading: membersLoading } =
    api.organization.getMembers.useQuery();

  const { data: teamRoles } = api.role.getByTeam.useQuery({ teamId });
  const nodes = useTeamStore((state) => state.nodes);

  const handleRoleClick = (roleId: string) => {
    setSelectedRoleId(roleId);
    setEditDialogOpen(true);
  };

  const selectedRole = teamRoles?.find((role) => role.id === selectedRoleId);
  const selectedNode = nodes.find(
    (node) => node.type === "role-node" && node.data.roleId === selectedRoleId,
  );
  const selectedRoleData =
    selectedRole && selectedNode
      ? ({
          ...selectedNode.data,
          nodeId: selectedNode.id,
        } as RoleNodeData & { nodeId: string })
      : null;

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
    <>
      {/* Circular Edge Trigger Button */}
      <TeamSheetEdgeTrigger
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />

      {/* Sheet Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <NonModalSheetContent
          side="right"
          className="w-[24rem] overflow-hidden p-0"
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex-shrink-0 border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
                <RoleDialog teamId={teamId} />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="[&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/60 flex-1 space-y-6 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {/* Team Info */}
              <div>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                  Team Info
                </h3>
                <div className="bg-card flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-muted-foreground text-sm font-medium">
                    Total Roles
                  </span>
                  <Badge variant="secondary" className="text-sm font-semibold">
                    {roleCount}
                  </Badge>
                </div>
              </div>

              {/* Roles List */}
              <div>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                  Roles
                </h3>
                <RolesList teamId={teamId} onRoleClick={handleRoleClick} />
              </div>

              {/* Organization Members */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Team Members
                  </h3>
                  <div className="flex items-center gap-2">
                    {members && (
                      <Badge
                        variant="secondary"
                        className="text-xs font-semibold"
                      >
                        {members.length}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        setTeamMembersExpanded(!teamMembersExpanded)
                      }
                      aria-label={
                        teamMembersExpanded
                          ? "Collapse team members"
                          : "Expand team members"
                      }
                    >
                      {teamMembersExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {teamMembersExpanded && (
                  <div className="space-y-2">
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
                          key={member.id}
                          member={member}
                          roleCount={roleCountByUser[member.id] ?? 0}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </NonModalSheetContent>
      </Sheet>

      {/* Edit Role Dialog */}
      {selectedRoleData && (
        <RoleDialog
          teamId={teamId}
          roleData={selectedRoleData}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedRoleId(null);
          }}
        />
      )}
    </>
  );
}
