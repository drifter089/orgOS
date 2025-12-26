"use client";

import { Briefcase, Plus, Target } from "lucide-react";

import { PlatformsDialog } from "@/app/integration/_components";
import { Button } from "@/components/ui/button";
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
          <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl">
            <Plus className="h-4 w-4" />
            <Briefcase className="h-4 w-4" />
            <span className="text-sm font-medium">Role</span>
          </Button>
        }
      />

      <PlatformsDialog
        teamId={teamId}
        initialIntegrations={initialIntegrations}
        trigger={
          <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl">
            <Plus className="h-4 w-4" />
            <Target className="h-4 w-4" />
            <span className="text-sm font-medium">KPI</span>
          </Button>
        }
      />
    </div>
  );
}
