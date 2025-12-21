"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { type RouterOutputs, api } from "@/trpc/react";

import { MemberEffortChart } from "./member-effort-chart";
import { MemberGoalsChart } from "./member-goals-chart";
import { MemberHeader } from "./member-header";
import { MemberStatsCard } from "./member-stats-card";
import { TeamSection } from "./team-section";

type Member = RouterOutputs["organization"]["getMembers"][number];
type Role = RouterOutputs["role"]["getByUser"][number];
type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];

interface MemberPageClientProps {
  memberId: string;
  memberInfo: Member;
}

function LoadingState({ memberInfo }: { memberInfo: Member }) {
  return (
    <div className="container mx-auto px-4 py-6 pt-20">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <MemberHeader member={memberInfo} />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-full min-h-[100px] w-full" />
        </div>
        <div className="lg:col-span-6">
          <Skeleton className="h-[280px] w-full" />
        </div>
        <div className="lg:col-span-6">
          <Skeleton className="h-[280px] w-full" />
        </div>
        <div className="lg:col-span-12">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ memberInfo }: { memberInfo: Member }) {
  return (
    <div className="container mx-auto px-4 py-6 pt-20">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <MemberHeader member={memberInfo} />
        </div>
        <div className="lg:col-span-4">
          <MemberStatsCard roleCount={0} teamCount={0} totalEffortPoints={0} />
        </div>
        <div className="lg:col-span-12">
          <div className="border-border/60 text-muted-foreground bg-card flex flex-col items-center justify-center border border-dashed py-16 text-center">
            <h2 className="text-lg font-medium">No roles assigned</h2>
            <p className="mt-1 text-sm">
              This member doesn&apos;t have any roles assigned yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function groupRolesByTeam(roles: Role[]): Record<string, Role[]> {
  return roles.reduce(
    (acc, role) => {
      const teamId = role.team.id;
      acc[teamId] ??= [];
      acc[teamId].push(role);
      return acc;
    },
    {} as Record<string, Role[]>,
  );
}

export function MemberPageClient({
  memberId,
  memberInfo,
}: MemberPageClientProps) {
  const { data: roles, isLoading: rolesLoading } = api.role.getByUser.useQuery({
    userId: memberId,
  });
  const { data: dashboardCharts, isLoading: chartsLoading } =
    api.dashboard.getDashboardCharts.useQuery();

  if (rolesLoading || chartsLoading) {
    return <LoadingState memberInfo={memberInfo} />;
  }

  if (!roles || roles.length === 0) {
    return <EmptyState memberInfo={memberInfo} />;
  }

  const rolesByTeam = groupRolesByTeam(roles);

  const chartsByMetricId = new Map<string, DashboardMetrics[number]>();
  for (const chart of dashboardCharts ?? []) {
    chartsByMetricId.set(chart.metric.id, chart);
  }

  const totalEffortPoints = roles.reduce(
    (sum, role) => sum + (role.effortPoints ?? 0),
    0,
  );

  const teamCount = Object.keys(rolesByTeam).length;

  const sortedTeamEntries = Object.entries(rolesByTeam).sort(([, a], [, b]) =>
    a[0]!.team.name.localeCompare(b[0]!.team.name),
  );

  // Process goals data for the radar chart
  const goalsData = roles
    .filter((role) => {
      if (!role.metricId) return false;
      const chart = chartsByMetricId.get(role.metricId);
      return chart?.goalProgress != null;
    })
    .map((role) => {
      const chart = chartsByMetricId.get(role.metricId!)!;
      return {
        goalName: chart.metric.name ?? role.metric?.name ?? "Unknown",
        progressPercent: chart.goalProgress!.progressPercent,
        status: chart.goalProgress!.status,
      };
    });

  return (
    <div className="container mx-auto px-4 py-6 pt-20">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Header Block */}
        <div className="lg:col-span-8">
          <MemberHeader member={memberInfo} />
        </div>

        {/* Stats Block */}
        <div className="lg:col-span-4">
          <MemberStatsCard
            roleCount={roles.length}
            teamCount={teamCount}
            totalEffortPoints={totalEffortPoints}
          />
        </div>

        {/* Effort Chart */}
        <div className="lg:col-span-6">
          <MemberEffortChart
            roles={roles}
            totalEffortPoints={totalEffortPoints}
          />
        </div>

        {/* Goals Chart */}
        <div className="lg:col-span-6">
          <MemberGoalsChart goalsData={goalsData} />
        </div>

        {/* Team Sections */}
        <div className="space-y-3 lg:col-span-12">
          {sortedTeamEntries.map(([teamId, teamRoles]) => (
            <TeamSection
              key={teamId}
              team={teamRoles[0]!.team}
              roles={teamRoles}
              chartsByMetricId={chartsByMetricId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
