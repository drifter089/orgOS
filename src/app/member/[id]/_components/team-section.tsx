"use client";

import { useState } from "react";

import Link from "next/link";

import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { type RouterOutputs } from "@/trpc/react";

import { RoleKpiPair } from "./role-kpi-pair";

type Role = RouterOutputs["role"]["getByUser"][number];
type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];

interface TeamSectionProps {
  team: Role["team"];
  roles: Role[];
  chartsByMetricId: Map<string, DashboardMetrics[number]>;
}

export function TeamSection({
  team,
  roles,
  chartsByMetricId,
}: TeamSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const teamEffortPoints = roles.reduce(
    (sum, role) => sum + (role.effortPoints ?? 0),
    0,
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-border/60 bg-card border">
        <CollapsibleTrigger asChild>
          <button
            className="hover:bg-accent/30 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
            aria-label={
              isOpen ? `Collapse ${team.name}` : `Expand ${team.name}`
            }
          >
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              <span className="text-lg font-semibold">{team.name}</span>
              <Link
                href={`/teams/${team.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Open team canvas"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <span className="text-muted-foreground text-xs tracking-wider uppercase">
                {roles.length} {roles.length === 1 ? "role" : "roles"}
              </span>
            </div>
            <span className="bg-muted px-2 py-1 text-sm font-medium">
              {teamEffortPoints} pts
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-border/60 space-y-4 border-t px-4 py-4">
            {roles.map((role) => (
              <RoleKpiPair
                key={role.id}
                role={role}
                dashboardChart={
                  role.metricId
                    ? chartsByMetricId.get(role.metricId)
                    : undefined
                }
                teamId={team.id}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
