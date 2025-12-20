"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { type RouterOutputs, api } from "@/trpc/react";

import { MemberHeader } from "./member-header";
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
    <div className="container mx-auto px-4 py-8 pt-24">
      <MemberHeader member={memberInfo} totalEffortPoints={0} />
      <div className="mt-8 space-y-6">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState({ memberInfo }: { memberInfo: Member }) {
  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <MemberHeader member={memberInfo} totalEffortPoints={0} />
      <div className="mt-8">
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-lg font-medium">No roles assigned</p>
          <p className="mt-1 text-sm">
            This member doesn&apos;t have any roles assigned yet.
          </p>
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

  const sortedTeamEntries = Object.entries(rolesByTeam).sort(([, a], [, b]) =>
    a[0]!.team.name.localeCompare(b[0]!.team.name),
  );

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <MemberHeader member={memberInfo} totalEffortPoints={totalEffortPoints} />

      <div className="mt-8 space-y-6">
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
  );
}
