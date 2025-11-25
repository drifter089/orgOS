import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/server";

import { DashboardClient } from "./_components/dashboard-client";
import { DashboardSidebar } from "./_components/dashboard-sidebar";

interface TeamDashboardPageProps {
  params: Promise<{ teamId: string }>;
}

export async function generateMetadata({ params }: TeamDashboardPageProps) {
  const { teamId } = await params;
  const team = await api.team.getById({ id: teamId });

  return {
    title: team ? `${team.name} - Dashboard` : "Team Dashboard",
    description: "Monitor and visualize your team's metrics",
  };
}

export default async function TeamDashboardPage({
  params,
}: TeamDashboardPageProps) {
  const { teamId } = await params;

  // Verify team exists and user has access (workspaceProcedure handles org check)
  const team = await api.team.getById({ id: teamId });
  if (!team) {
    notFound();
  }

  // Prefetch dashboard metrics (server-side)
  const dashboardMetrics = await api.dashboard.getByTeam({ teamId });

  // Prefetch team metrics for sidebar
  const metrics = await api.metric.getByTeam({ teamId });

  // Prefetch org integrations (still org-level)
  const integrationsData = await api.integration.listWithStats();

  return (
    <div className="flex h-screen flex-col">
      {/* Floating Sidebar */}
      <DashboardSidebar
        teamId={teamId}
        metrics={metrics}
        integrationsData={integrationsData}
      />

      {/* Header */}
      <div className="bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/teams/roles/${teamId}`}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to Roles
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold">{team.name} Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Monitor and visualize your team&apos;s metrics
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <DashboardClient
            teamId={teamId}
            initialDashboardMetrics={dashboardMetrics}
          />
        </div>
      </main>
    </div>
  );
}
