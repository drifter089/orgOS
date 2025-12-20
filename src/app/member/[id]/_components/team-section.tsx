"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-accent/50 cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={
                    isOpen ? `Collapse ${team.name}` : `Expand ${team.name}`
                  }
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <CardTitle className="text-xl">{team.name}</CardTitle>
                <Badge variant="secondary" className="gap-1.5">
                  <Users className="h-3 w-3" />
                  {roles.length} {roles.length === 1 ? "role" : "roles"}
                </Badge>
              </div>
              <Badge variant="outline" className="text-lg font-semibold">
                {teamEffortPoints} pts
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
