"use client";

import { useState } from "react";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Target,
  Users,
  X,
} from "lucide-react";

import { DashboardSidebar } from "@/app/dashboard/[teamId]/_components/dashboard-sidebar";
import { type DashboardChart } from "@/app/metric/_components";
import { MembersPanel } from "@/components/member/member-list";
import { RoleCard } from "@/components/role/role-card";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type RouterOutputs, api } from "@/trpc/react";

import { useChartDragContext } from "../context/chart-drag-context";
import { useTeamStore } from "../store/team-store";
import { RoleDialog } from "./role-dialog";

type Member = RouterOutputs["organization"]["getMembers"][number];
type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

function NonModalSheetContent({
  className,
  children,
  side = "right",
  hideCloseButton = false,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  hideCloseButton?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Content
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-[60] flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
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
        {!hideCloseButton && (
          <SheetPrimitive.Close className="border-border hover:bg-accent focus:ring-ring absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border transition-all focus:ring-2 focus:outline-hidden disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
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
          <RoleCard
            key={role.id}
            role={role}
            teamId={teamId}
            isPending={isPending}
            onEdit={() => !isPending && onRoleClick?.(role.id)}
          />
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
  kpiCount: number;
}

function RightSideToggleButtons({
  activePanel,
  onToggle,
  memberCount,
  roleCount,
  kpiCount,
}: RightSideToggleButtonsProps) {
  const getButtonPosition = () => {
    return activePanel ? "right-[26.5rem]" : "right-4";
  };

  const buttonBaseClass = cn(
    "flex items-center gap-1 md:gap-1.5",
    "h-8 px-2 md:h-9 md:px-2.5",
    "rounded-md border bg-background",
    "shadow-md hover:shadow-lg",
    "transition-all duration-200",
    "text-xs md:text-sm font-medium",
  );

  const activeClass = "bg-accent border-primary";
  const inactiveClass = "hover:bg-accent/50";

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
          buttonBaseClass,
          activePanel === "members" ? activeClass : inactiveClass,
        )}
        aria-label={
          activePanel === "members"
            ? "Close Members sidebar"
            : "Open Members sidebar"
        }
      >
        <Users className="h-4 w-4" />
        <span className="hidden md:inline">Members</span>
        <span>({memberCount})</span>
        {activePanel === "members" ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <button
        onClick={() => onToggle(activePanel === "roles" ? null : "roles")}
        className={cn(
          buttonBaseClass,
          activePanel === "roles" ? activeClass : inactiveClass,
        )}
        aria-label={
          activePanel === "roles" ? "Close Roles sidebar" : "Open Roles sidebar"
        }
      >
        <Briefcase className="h-4 w-4" />
        <span className="hidden md:inline">Roles</span>
        <span>({roleCount})</span>
        {activePanel === "roles" ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <button
        onClick={() => onToggle(activePanel === "kpis" ? null : "kpis")}
        className={cn(
          buttonBaseClass,
          activePanel === "kpis" ? activeClass : inactiveClass,
        )}
        aria-label={
          activePanel === "kpis" ? "Close KPIs sidebar" : "Open KPIs sidebar"
        }
      >
        <Target className="h-4 w-4" />
        <span className="hidden md:inline">KPIs</span>
        <span>({kpiCount})</span>
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
  const { data: dashboardCharts } = api.dashboard.getDashboardCharts.useQuery({
    teamId,
  });
  const kpiCount = dashboardCharts?.length ?? 0;

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
        kpiCount={kpiCount}
      />

      <Sheet
        open={activePanel === "members"}
        onOpenChange={(open) => setActivePanel(open ? "members" : null)}
        modal={false}
      >
        <NonModalSheetContent
          side="right"
          className="w-[26rem] overflow-hidden p-0 sm:max-w-none"
          hideCloseButton
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
          className="w-[26rem] overflow-hidden p-0 sm:max-w-none"
        >
          <div className="flex h-full flex-col">
            <div className="flex-shrink-0 border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Roles</h2>
                <RoleDialog teamId={teamId} />
              </div>
            </div>

            <div className="[&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/60 flex-1 space-y-4 overflow-y-auto px-4 py-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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
