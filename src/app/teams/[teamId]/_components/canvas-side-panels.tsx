"use client";

import { useState } from "react";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Target,
  Trash2,
  Users,
} from "lucide-react";

import { DashboardSidebar } from "@/app/dashboard/[teamId]/_components/dashboard-sidebar";
import { type DashboardChart } from "@/app/metric/_components";
import { MembersPanel } from "@/components/member/member-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { stripHtml } from "@/lib/html-utils";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import { type RouterOutputs, api } from "@/trpc/react";

import { useChartDragContext } from "../context/chart-drag-context";
import { useDeleteRole } from "../hooks/use-delete-role";
import { useTeamStore } from "../store/team-store";
import { RoleDialog } from "./role-dialog";

type Member = RouterOutputs["organization"]["getMembers"][number];
type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

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
        <SheetPrimitive.Title className="sr-only">Sidebar</SheetPrimitive.Title>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
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

  const { data: roles, isLoading } = api.role.getByTeamId.useQuery({ teamId });

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
                {stripHtml(role.purpose ?? "")}
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
                variant="outline"
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

type ActivePanel = "members" | "roles" | "kpis" | null;

interface RightSideToggleButtonsProps {
  activePanel: ActivePanel;
  onToggle: (panel: ActivePanel) => void;
  memberCount: number;
  roleCount: number;
}

function RightSideToggleButtons({
  activePanel,
  onToggle,
  memberCount,
  roleCount,
}: RightSideToggleButtonsProps) {
  const getButtonPosition = () => {
    return activePanel ? "right-[40.5rem]" : "right-4";
  };

  return (
    <div
      className={cn(
        "fixed top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2 transition-all duration-300 ease-in-out",
        getButtonPosition(),
      )}
    >
      <button
        onClick={() => onToggle(activePanel === "members" ? null : "members")}
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          "rounded-lg border",
          "shadow-lg hover:shadow-xl",
          "transition-all duration-200",
          activePanel === "members"
            ? "bg-background/60 hover:bg-background/80 backdrop-blur-md"
            : "bg-primary text-primary-foreground border-primary hover:brightness-110",
        )}
        aria-label={
          activePanel === "members"
            ? "Close Members sidebar"
            : "Open Members sidebar"
        }
      >
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">Members</span>
        <span className="text-sm font-medium">({memberCount})</span>
        {activePanel === "members" ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <button
        onClick={() => onToggle(activePanel === "roles" ? null : "roles")}
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          "rounded-lg border",
          "shadow-lg hover:shadow-xl",
          "transition-all duration-200",
          activePanel === "roles"
            ? "bg-background/60 hover:bg-background/80 backdrop-blur-md"
            : "bg-primary text-primary-foreground border-primary hover:brightness-110",
        )}
        aria-label={
          activePanel === "roles" ? "Close Roles sidebar" : "Open Roles sidebar"
        }
      >
        <Briefcase className="h-4 w-4" />
        <span className="text-sm font-medium">Roles</span>
        <span className="text-sm font-medium">({roleCount})</span>
        {activePanel === "roles" ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <button
        onClick={() => onToggle(activePanel === "kpis" ? null : "kpis")}
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          "rounded-lg border",
          "shadow-lg hover:shadow-xl",
          "transition-all duration-200",
          activePanel === "kpis"
            ? "bg-background/60 hover:bg-background/80 backdrop-blur-md"
            : "bg-primary text-primary-foreground border-primary hover:brightness-110",
        )}
        aria-label={
          activePanel === "kpis" ? "Close KPIs sidebar" : "Open KPIs sidebar"
        }
      >
        <Target className="h-4 w-4" />
        <span className="text-sm font-medium">KPIs</span>
        {activePanel === "kpis" ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

interface CanvasSidePanelsProps {
  teamId: string;
  teamName: string;
  roleCount: number;
  members: Member[];
  initialIntegrations: IntegrationsWithStats;
}

export function CanvasSidePanels({
  teamId,
  teamName: _teamName,
  roleCount,
  members,
  initialIntegrations,
}: CanvasSidePanelsProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const nodes = useTeamStore((state) => state.nodes);
  const { chartNodesOnCanvas, onToggleChartVisibility } = useChartDragContext();
  const { data: memberStats } = api.organization.getMemberStats.useQuery();

  const handleToggle = (panel: ActivePanel) => {
    setActivePanel(panel);
  };

  const handleRoleClick = (roleId: string) => {
    setSelectedRoleId(roleId);
    setEditDialogOpen(true);
  };

  const selectedNode = nodes.find(
    (node) => node.type === "role-node" && node.data.roleId === selectedRoleId,
  );
  const selectedRoleData =
    selectedRoleId && selectedNode
      ? { roleId: selectedRoleId, nodeId: selectedNode.id }
      : null;

  return (
    <>
      <RightSideToggleButtons
        activePanel={activePanel}
        onToggle={handleToggle}
        memberCount={members.length}
        roleCount={roleCount}
      />

      <Sheet
        open={activePanel === "members"}
        onOpenChange={(open) => setActivePanel(open ? "members" : null)}
        modal={false}
      >
        <NonModalSheetContent
          side="right"
          className="w-[40rem] overflow-hidden p-0 sm:max-w-none"
        >
          <MembersPanel members={members} memberStats={memberStats} />
        </NonModalSheetContent>
      </Sheet>

      <Sheet
        open={activePanel === "roles"}
        onOpenChange={(open) => setActivePanel(open ? "roles" : null)}
        modal={false}
      >
        <NonModalSheetContent
          side="right"
          className="w-[40rem] overflow-hidden p-0 sm:max-w-none"
        >
          <div className="flex h-full flex-col">
            <div className="flex-shrink-0 border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
                <RoleDialog teamId={teamId} />
              </div>
            </div>

            <div className="[&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/60 flex-1 space-y-6 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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

              <div>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                  Roles
                </h3>
                <RolesList teamId={teamId} onRoleClick={handleRoleClick} />
              </div>
            </div>
          </div>
        </NonModalSheetContent>
      </Sheet>

      <DashboardSidebar
        teamId={teamId}
        initialIntegrations={initialIntegrations}
        side="right"
        enableDragDrop={true}
        chartNodesOnCanvas={chartNodesOnCanvas}
        onToggleChartVisibility={
          onToggleChartVisibility as
            | ((dashboardChart: DashboardChart) => void)
            | undefined
        }
        externalOpen={activePanel === "kpis"}
        onExternalOpenChange={(open) => setActivePanel(open ? "kpis" : null)}
      />

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
