import { HydrateClient, api } from "@/trpc/server";

import { DashboardPageClient } from "./_components/dashboard-page-client";

interface DashboardPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { teamId } = await params;

  await Promise.all([
    api.dashboard.getDashboardMetrics.prefetch({ teamId }),
    api.integration.listWithStats.prefetch(),
  ]);

  return (
    <HydrateClient>
      <DashboardPageClient teamId={teamId} />
    </HydrateClient>
  );
}
