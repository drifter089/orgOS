"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { type RouterOutputs } from "@/trpc/react";

import { MemberRoleCard } from "./member-role-card";

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
          <div className="border-border/60 border-t px-4 py-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {roles.map((role) => (
                <MemberRoleCard
                  key={role.id}
                  role={role}
                  dashboardChart={
                    role.metricId
                      ? chartsByMetricId.get(role.metricId)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
