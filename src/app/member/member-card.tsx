"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ArrowRight, ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";

import { GoalsBarChart, MetricPieChart } from "@/components/charts";
import { KpiCard } from "@/components/metric/kpi-card";
import { RoleCard, type RoleCardData } from "@/components/role/role-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];
type DashboardCharts = RouterOutputs["dashboard"]["getDashboardCharts"];
type Role = RouterOutputs["role"]["getByUser"][number];

const CHART_HEIGHT = "h-[280px]";

interface MemberCardProps {
  member: Member;
  dashboardCharts: DashboardCharts;
}

function getDisplayName(member: Member): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
  return name || member.email;
}

function getInitials(member: Member): string {
  if (member.firstName || member.lastName) {
    return [member.firstName?.[0], member.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase();
  }
  return member.email.slice(0, 2).toUpperCase();
}

function roleToCardData(role: Role): RoleCardData {
  return {
    id: role.id,
    title: role.title,
    purpose: role.purpose ?? "",
    color: role.color ?? "#3b82f6",
    effortPoints: role.effortPoints,
    assignedUserId: role.assignedUserId,
    assignedUserName: null,
    metric: role.metric
      ? {
          name: role.metric.name,
          dashboardCharts: role.metric.dashboardCharts,
        }
      : null,
  };
}

export function MemberCard({ member, dashboardCharts }: MemberCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: roles, isLoading } = api.role.getByUser.useQuery({
    userId: member.id,
  });

  const chartsByMetricId = new Map<string, DashboardCharts[number]>();
  for (const chart of dashboardCharts) {
    chartsByMetricId.set(chart.metric.id, chart);
  }

  const totalEffortPoints =
    roles?.reduce((sum, role) => sum + (role.effortPoints ?? 0), 0) ?? 0;

  const rolesWithEffort =
    roles?.filter((role) => role.effortPoints && role.effortPoints > 0) ?? [];

  // Extract unique teams from roles
  const uniqueTeams = useMemo(() => {
    if (!roles) return [];
    const teamMap = new Map<string, { id: string; name: string }>();
    for (const role of roles) {
      if (role.team && !teamMap.has(role.team.id)) {
        teamMap.set(role.team.id, { id: role.team.id, name: role.team.name });
      }
    }
    return Array.from(teamMap.values());
  }, [roles]);

  // Filter KPIs for this member (metrics linked to their roles)
  const memberKpis = useMemo(() => {
    if (!roles || dashboardCharts.length === 0) return [];
    const memberMetricIds = new Set(
      roles.filter((r) => r.metricId != null).map((r) => r.metricId!),
    );
    return dashboardCharts.filter((chart) =>
      memberMetricIds.has(chart.metric.id),
    );
  }, [roles, dashboardCharts]);

  const pieChartData = rolesWithEffort.map((role, index) => ({
    name: role.title,
    value: role.effortPoints!,
    fill: role.color ?? `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  const pieChartConfig: ChartConfig = rolesWithEffort.reduce((acc, role) => {
    acc[role.title] = {
      label: role.title,
      color: role.color,
    };
    return acc;
  }, {} as ChartConfig);

  // Get metric IDs for roles that have goals
  const metricIdsWithGoals =
    roles
      ?.filter((role) => role.metricId != null)
      .map((role) => role.metricId!) ?? [];

  const hasRolesOrKpis = (roles?.length ?? 0) > 0 || memberKpis.length > 0;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 md:flex-row">
        {/* Left Column - Member Info */}
        <div className="flex w-full flex-col gap-3 md:w-[220px] md:shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              {member.profilePictureUrl && (
                <AvatarImage
                  src={member.profilePictureUrl}
                  alt={getDisplayName(member)}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-base font-medium">
                {getInitials(member)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base leading-tight font-semibold">
                {getDisplayName(member)}
              </h3>
              <p className="text-muted-foreground/80 truncate text-sm">
                {member.email}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {roles?.length ?? 0} {roles?.length === 1 ? "role" : "roles"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {totalEffortPoints} pts
                </Badge>
              </div>

              {uniqueTeams.length > 0 && (
                <div className="mt-1 space-y-1.5">
                  <div className="text-foreground flex items-center gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold">Teams</span>
                  </div>
                  <ul className="space-y-1 pl-5">
                    {uniqueTeams.map((team) => (
                      <li key={team.id}>
                        <Link
                          href={`/teams/${team.id}`}
                          className="text-muted-foreground hover:text-primary text-xs underline-offset-2 transition-colors hover:underline"
                        >
                          {team.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="group/btn mt-auto w-fit gap-2 transition-all hover:gap-3"
          >
            <Link href={`/member/${member.id}`}>
              View Details
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </Button>
        </div>

        {/* Right Column - Charts */}
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          {isLoading ? (
            <>
              <Skeleton className={`${CHART_HEIGHT} w-full`} />
              <Skeleton className={`${CHART_HEIGHT} w-full`} />
            </>
          ) : (
            <>
              <div className={`flex ${CHART_HEIGHT} flex-col`}>
                <span className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
                  Effort Distribution
                </span>
                {rolesWithEffort.length > 0 ? (
                  <MetricPieChart
                    chartData={pieChartData}
                    chartConfig={pieChartConfig}
                    xAxisKey="name"
                    dataKeys={["value"]}
                    showLegend={true}
                    showTooltip={true}
                    centerLabel={{
                      value: totalEffortPoints,
                      label: "Total",
                    }}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
                    No effort data
                  </div>
                )}
              </div>

              <GoalsBarChart
                metricIds={metricIdsWithGoals}
                showHeader={false}
                simpleLegend={true}
                className={CHART_HEIGHT}
                noBorder={true}
              />
            </>
          )}
        </div>
      </div>

      {/* Expandable Section for Roles & KPIs */}
      {hasRolesOrKpis && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant={isExpanded ? "outline" : "secondary"}
              size="sm"
              className="mt-4 w-full justify-center gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Hide Roles & KPIs</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="text-sm font-medium">Show Roles & KPIs</span>
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-6">
            {/* Roles Section */}
            {roles && roles.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Roles ({roles.length})
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={roleToCardData(role)}
                      readOnly={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* KPIs Section */}
            {memberKpis.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  KPIs ({memberKpis.length})
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {memberKpis.map((chart) => (
                    <KpiCard
                      key={chart.id}
                      dashboardChart={chart}
                      teamId={chart.metric.teamId ?? ""}
                      showSettings={false}
                      enableDragDrop={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}
