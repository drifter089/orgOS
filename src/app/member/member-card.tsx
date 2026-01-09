"use client";

import { useMemo } from "react";

import Link from "next/link";

import { ArrowRight, Users } from "lucide-react";

import { GoalsRadarChart, MetricPieChart } from "@/components/charts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];
type DashboardCharts = RouterOutputs["dashboard"]["getDashboardCharts"];

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

export function MemberCard({ member, dashboardCharts }: MemberCardProps) {
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

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex w-full flex-col gap-4 md:w-[220px] md:shrink-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              {member.profilePictureUrl && (
                <AvatarImage
                  src={member.profilePictureUrl}
                  alt={getDisplayName(member)}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(member)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold">
                {getDisplayName(member)}
              </h3>
              <p className="text-muted-foreground truncate text-sm">
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
                <Badge variant="secondary">
                  {roles?.length ?? 0} {roles?.length === 1 ? "role" : "roles"}
                </Badge>
                <Badge variant="outline">{totalEffortPoints} pts</Badge>
              </div>
              {uniqueTeams.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Users className="text-muted-foreground h-3.5 w-3.5" />
                  {uniqueTeams.map((team) => (
                    <Link key={team.id} href={`/teams/${team.id}`}>
                      <Badge
                        variant="outline"
                        className="hover:bg-accent cursor-pointer text-xs transition-colors"
                      >
                        {team.name}
                      </Badge>
                    </Link>
                  ))}
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

        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          {isLoading ? (
            <>
              <Skeleton className="h-[320px] w-full" />
              <Skeleton className="h-[320px] w-full" />
            </>
          ) : (
            <>
              <div className="border-border/40 flex h-[380px] flex-col rounded-md border p-4">
                <span className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
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
                    className="h-[280px] w-full"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
                    No effort data
                  </div>
                )}
              </div>

              <GoalsRadarChart
                metricIds={metricIdsWithGoals}
                showHeader={false}
                className="h-[380px] rounded-md"
              />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
