"use client";

import Link from "next/link";

import { MetricPieChart, MetricRadarChart } from "@/components/charts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

  const goalsData =
    roles
      ?.filter((role) => {
        if (!role.metricId) return false;
        const chart = chartsByMetricId.get(role.metricId);
        return chart?.goalProgress != null;
      })
      .map((role) => {
        const chart = chartsByMetricId.get(role.metricId!)!;
        return {
          goal: chart.metric.name ?? role.metric?.name ?? "Unknown",
          progress: Math.max(
            0,
            Math.min(100, chart.goalProgress!.progressPercent),
          ),
        };
      }) ?? [];

  const radarChartConfig: ChartConfig = {
    progress: {
      label: "Progress",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Link href={`/member/${member.id}`} className="block">
      <Card className="group hover:border-primary/50 hover:bg-accent/30 flex cursor-pointer gap-6 p-6 transition-colors">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarImage
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getDisplayName(member))}`}
            alt={getDisplayName(member)}
          />
          <AvatarFallback className="text-lg">
            {getInitials(member)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 items-center gap-6">
          <div className="flex min-w-[200px] shrink-0 flex-col justify-center">
            <h3 className="group-hover:text-primary truncate text-xl font-semibold transition-colors">
              {getDisplayName(member)}
            </h3>
            <p className="text-muted-foreground truncate text-sm">
              {member.email}
            </p>
            {isLoading ? (
              <div className="mt-2 flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {roles?.length ?? 0} {roles?.length === 1 ? "role" : "roles"}
                </Badge>
                <Badge variant="outline">{totalEffortPoints} pts</Badge>
              </div>
            )}
          </div>

          <div className="flex flex-1 items-center justify-center gap-8">
            {isLoading ? (
              <>
                <Skeleton className="h-[160px] w-[200px]" />
                <Skeleton className="h-[160px] w-[200px]" />
              </>
            ) : (
              <>
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
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
                      className="h-[160px] w-[200px]"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-[160px] w-[200px] items-center justify-center text-sm">
                      No effort data
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
                    Goals Progress
                  </span>
                  {goalsData.length > 0 ? (
                    <MetricRadarChart
                      chartData={goalsData}
                      chartConfig={radarChartConfig}
                      xAxisKey="goal"
                      dataKeys={["progress"]}
                      showLegend={false}
                      showTooltip={true}
                      className="h-[160px] w-[200px]"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-[160px] w-[200px] items-center justify-center text-sm">
                      No goals data
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
