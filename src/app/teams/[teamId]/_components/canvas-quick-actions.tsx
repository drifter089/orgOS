"use client";

import { Briefcase, Gauge, Plus } from "lucide-react";

import { PlatformsDialog } from "@/app/integration/_components";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RouterOutputs } from "@/trpc/react";

import { RoleDialog } from "./role-dialog";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface CanvasQuickActionsProps {
  teamId: string;
  initialIntegrations: IntegrationsWithStats;
}

export function CanvasQuickActions({
  teamId,
  initialIntegrations,
}: CanvasQuickActionsProps) {
  return (
    <div className="fixed top-1/2 left-4 z-50 flex -translate-y-1/2 flex-col gap-2">
      <RoleDialog
        teamId={teamId}
        trigger={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl">
                <Plus className="h-4 w-4" />
                <Briefcase className="h-4 w-4" />
                <span className="text-sm font-medium">Role</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add a new role to the canvas</p>
            </TooltipContent>
          </Tooltip>
        }
      />

      <PlatformsDialog
        teamId={teamId}
        initialIntegrations={initialIntegrations}
        trigger={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl">
                <Plus className="h-4 w-4" />
                <Gauge className="h-4 w-4" />
                <span className="text-sm font-medium">KPI</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add a new KPI</p>
            </TooltipContent>
          </Tooltip>
        }
      />
    </div>
  );
}
