"use client";

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
          <Button
            variant="outline"
            className="h-9 px-3 text-sm font-medium shadow-lg hover:shadow-xl md:h-10 md:px-4"
          >
            + Role
          </Button>
        }
      />

      <PlatformsDialog
        teamId={teamId}
        initialIntegrations={initialIntegrations}
        trigger={
          <Button
            variant="outline"
            className="h-9 px-3 text-sm font-medium shadow-lg hover:shadow-xl md:h-10 md:px-4"
          >
            + KPI
          </Button>
        }
      />
    </div>
  );
}
